import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { switchMap, catchError, take } from 'rxjs/operators';
import { throwError, timer, retry, EMPTY } from 'rxjs';
import { LoggerService } from '../services/logger.service';
import { environment } from '../../../environments/environment';

/**
 * Auth Interceptor to ensure Auth0 access token is attached to API requests
 * 
 * FIX: Handles token refresh properly by:
 * 1. Getting tokens with default cache (SDK handles refresh automatically)
 * 2. If token retrieval fails, error interceptor will retry with cacheMode: 'off'
 * 3. This ensures expired tokens are refreshed using refresh tokens
 */
function isAuthError(error: unknown): boolean {
  const e = error as Record<string, unknown>;
  return (
    e?.['error'] === 'login_required' ||
    e?.['error'] === 'invalid_grant' ||
    e?.['error'] === 'missing_refresh_token' ||
    e?.['error'] === 'interaction_required' ||
    (typeof e?.['message'] === 'string' && (
      (e['message'] as string).includes('login_required') ||
      (e['message'] as string).includes('Missing Refresh Token') ||
      (e['message'] as string).includes('Consent required')
    ))
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept requests to our API
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  // Skip if this is a retry attempt from error interceptor (it already has a fresh token)
  if (req.headers.has('X-Retry-Attempt')) {
    return next(req);
  }

  // Inject services at the top level (within injection context)
  const auth0 = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);
  
  // Check if user is authenticated first
  return auth0.isAuthenticated$.pipe(
    take(1),
    switchMap(isAuthenticated => {
      if (environment.enableDebugMode) {
        console.log('[Auth Interceptor] URL:', req.url.split('?')[0], '| Authenticated:', isAuthenticated);
      }
      
      if (!isAuthenticated) {
        // User not authenticated - redirect to login immediately, don't send the request
        if (environment.enableDebugMode) {
          console.log('[Auth Interceptor] User not authenticated, redirecting to login');
        }
        router.navigate(['/login'], { replaceUrl: true });
        return EMPTY;
      }
      
      // User is authenticated - get a token
      // The SDK with useRefreshTokens: true should automatically refresh expired tokens
      // If it doesn't work, we'll get 401 and error interceptor will force refresh
      return auth0.getAccessTokenSilently({
        authorizationParams: {
          audience: environment.auth0.audience
        }
        // Using default cache mode - SDK should refresh expired tokens automatically
      }).pipe(
        // Retry up to 3 times with exponential backoff if token retrieval fails
        retry({
          count: 3,
          delay: (error: any, retryCount: number) => {
            // Don't retry on auth errors - these require user to log in and won't succeed on retry
            if (isAuthError(error)) {
              return throwError(() => error);
            }
            // Exponential backoff: 500ms, 1s, 2s
            const delayMs = Math.min(500 * Math.pow(2, retryCount - 1), 2000);
            return timer(delayMs);
          }
        }),
        switchMap(token => {
          if (!token) {
            logger.errorWithPrefix('Auth Interceptor', 'Token is null after retrieval', { url: req.url });
            return throwError(() => new Error('Authentication token unavailable'));
          }
          
          if (environment.enableDebugMode) {
            console.log('[Auth Interceptor] Token attached to:', req.url.split('?')[0], '| Token length:', token.length);
          }
          
          // Attach token to request
          const cloned = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });
          
          return next(cloned);
        }),
        catchError((error) => {
          // Auth0 errors that require the user to log in again (refresh token expired/revoked, session ended)
          if (isAuthError(error)) {
            // Redirect to login - don't propagate the error or send the request
            router.navigate(['/login'], { replaceUrl: true });
            return EMPTY;
          }

          // Token retrieval failed for a non-auth reason - propagate error
          if (!(error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403))) {
            logger.errorWithPrefix('Auth Interceptor', 'Failed to retrieve access token', {
              error: error.message || error,
              url: req.url
            });
          }
          return throwError(() => error);
        })
      );
    }),
    catchError((error) => {
      // Auth0 errors bubbled up from token retrieval (e.g., EMPTY wasn't returned by inner catchError)
      if (isAuthError(error)) {
        router.navigate(['/login'], { replaceUrl: true });
        return EMPTY;
      }

      // Error checking authentication status (unexpected RxJS error from isAuthenticated$)
      if (!isAuthError(error) &&
          !(error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403))) {
        logger.errorWithPrefix('Auth Interceptor', 'Error checking authentication status', error);
      }
      // If there's an error checking auth status, send request without token
      // Backend will handle authentication check
      if (environment.enableDebugMode) {
        console.warn('[Auth Interceptor] Error checking auth status, sending request without token:', req.url);
      }
      return next(req);
    })
  );
};
