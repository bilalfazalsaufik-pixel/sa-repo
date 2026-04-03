import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { Observable, of, timer, throwError, retry } from 'rxjs';
import { switchMap, take, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { PermissionService } from './permission.service';
import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment';

export interface SyncUserRequest {
  auth0Id: string;
  email: string;
  firstName: string;
  lastName: string;
  provider: string;
}

export interface SyncUserResponse {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  isNewUser: boolean;
  tenantName: string;
}

export interface Auth0User {
  sub?: string;
  name?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth0 = inject(Auth0Service);
  private apiService = inject(ApiService);
  private permissionService = inject(PermissionService);
  private logger = inject(LoggerService);

  get isAuthenticated$(): Observable<boolean> {
    return this.auth0.isAuthenticated$;
  }

  get user$(): Observable<Auth0User | null> {
    return this.auth0.user$ as Observable<Auth0User | null>;
  }

  get accessToken$(): Observable<string | null> {
    return this.auth0.getAccessTokenSilently().pipe(
      catchError((error) => {
        // Don't log expected Auth0 flow errors:
        // - Consent required: user will be redirected to consent screen automatically
        // - Missing Refresh Token: expected on first load before a refresh token is cached
        if (!error?.message?.includes('Consent required') &&
            !error?.message?.includes('Missing Refresh Token')) {
          this.logger.errorWithPrefix('Auth Service', 'Failed to get access token', error);
        }
        return of(null);
      })
    );
  }

  login(): void {
    this.auth0.loginWithRedirect();
  }

  logout(): void {
    this.permissionService.clearPermissions();
    this.auth0.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  }

  syncUser(): Observable<SyncUserResponse> {
    return this.user$.pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Extract provider from sub (e.g., "google-oauth2|123456" -> "google-oauth2")
        const auth0Id = user.sub || '';
        const provider = auth0Id.split('|')[0] || 'auth0';
        
        // Parse name
        const name = user.name || '';
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || user.given_name || '';
        const lastName = nameParts.slice(1).join(' ') || user.family_name || '';

        const request: SyncUserRequest = {
          auth0Id: auth0Id,
          email: user.email || '',
          firstName: firstName,
          lastName: lastName,
          provider: provider
        };
        
        // Explicitly get access token with audience before making the request
        // Retry with delay if token isn't immediately available (handles timing issues after login)
        // FIX: Removed cacheMode: 'on' to allow automatic token refresh when expired
        return this.auth0.getAccessTokenSilently({
          authorizationParams: {
            audience: environment.auth0.audience
          }
        }).pipe(
          // Retry up to 3 times with exponential backoff if token retrieval fails
          retry({
            count: 3,
            delay: (error: any, retryCount: number) => {
              // Don't retry on consent errors - these require user interaction
              if (error?.message?.includes('Consent required')) {
                return throwError(() => error);
              }
              // Don't retry on missing refresh token - fallback to iframe is handled by SDK
              if (error?.message?.includes('Missing Refresh Token')) {
                return throwError(() => error);
              }
              // Don't retry on 401/403 - these indicate auth/authorization issues
              if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
                return throwError(() => error);
              }
              // Exponential backoff: 1s, 2s, 3s
              const delayMs = Math.min(1000 * retryCount, 3000);
              return timer(delayMs);
            }
          }),
          switchMap((token) => {
            // Ensure we have a token before making the request
            if (!token) {
              throw new Error('Access token not available');
            }
            // Token is available - interceptor will attach it, but we've ensured it's ready
            return this.apiService.post<SyncUserResponse>('Auth/sync', request);
          }),
          catchError(error => {
            const isConsent = error?.message?.includes('Consent required');
            const isMissingToken = error?.message?.includes('Missing Refresh Token');
            const isAuthError = error instanceof HttpErrorResponse &&
              (error.status === 401 || error.status === 403);
            if (!isConsent && !isMissingToken && !isAuthError) {
              this.logger.errorWithPrefix('Auth Service', 'Sync user error', error);
            }
            throw error;
          })
        );
      })
    );
  }
}
