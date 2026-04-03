import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, switchMap, take, throwError, shareReplay, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Global token refresh lock to prevent multiple simultaneous refresh attempts
let tokenRefreshInProgress: Observable<string> | null = null;
let lastRefreshError: { timestamp: number; error: any } | null = null;
const REFRESH_ERROR_COOLDOWN = 5000;

/**
 * Error Interceptor: handles 401 token-refresh logic and re-throws all errors
 * so component error handlers (via ErrorService) show exactly ONE toast per failure.
 *
 * - 401 (authenticated, first try): attempt silent token refresh and retry once.
 * - 401 (can't refresh / already retried): redirect to /login.
 * - 403 / 500 / 0 / other: re-throw — component calls setErrorFromHttp() which
 *   deduplicates and shows a single toast via ErrorMessageComponent.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  const hasRetried = req.headers.has('X-Retry-Attempt');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Log the backend's 401 reason to the browser console so it is visible
        // in DevTools without needing access to the server log stream.
        const body = error.error;
        const reason = (typeof body === 'object' && body?.message) ? body.message : JSON.stringify(body);
        console.error(`[401 Unauthorized] ${req.method} ${req.url.split('?')[0]}\n  Backend reason: ${reason}`);

        return authService.isAuthenticated$.pipe(
          take(1),
          switchMap(isAuthenticated => {
            if (isAuthenticated && !hasRetried) {
              // Check cooldown after a recent refresh failure
              if (lastRefreshError && Date.now() - lastRefreshError.timestamp < REFRESH_ERROR_COOLDOWN) {
                router.navigate(['/login'], { replaceUrl: true });
                return throwError(() => error);
              }

              // Start or reuse an in-progress token refresh
              if (!tokenRefreshInProgress) {
                tokenRefreshInProgress = authService.getAccessTokenSilently({
                  authorizationParams: { audience: environment.auth0.audience },
                  cacheMode: 'off'
                }).pipe(
                  take(1),
                  shareReplay(1),
                  catchError(err => {
                    tokenRefreshInProgress = null;
                    lastRefreshError = { timestamp: Date.now(), error: err };
                    return throwError(() => err);
                  })
                );
              }

              return tokenRefreshInProgress.pipe(
                switchMap(token => {
                  tokenRefreshInProgress = null;
                  lastRefreshError = null;

                  if (!token) {
                    router.navigate(['/login'], { replaceUrl: true });
                    return throwError(() => error);
                  }

                  // Retry with fresh token
                  const cloned = req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${token}`,
                      'X-Retry-Attempt': 'true'
                    }
                  });
                  return next(cloned);
                }),
                catchError(() => {
                  router.navigate(['/login'], { replaceUrl: true });
                  return throwError(() => error);
                })
              );
            } else {
              // Already retried OR not authenticated — redirect to login
              router.navigate(['/login'], { replaceUrl: true });
              return throwError(() => error);
            }
          })
        );
      }

      // For all other errors (403, 500, 0, etc.) just re-throw.
      // Component error handlers call setErrorFromHttp() → ErrorService deduplicates → one toast.
      return throwError(() => error);
    })
  );
};
