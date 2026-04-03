import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { switchMap, catchError, take } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';
import { environment } from '../../../environments/environment';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  // Only attach tenant headers to API requests
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  // Skip tenant header for auth/sync endpoint - backend will resolve tenant from authenticated user
  if (req.url.includes('/auth/sync')) {
    return next(req);
  }

  // Inject services at the top level (within injection context)
  const auth0 = inject(AuthService);
  const logger = inject(LoggerService);
  
  // Check if user is authenticated first
  return auth0.isAuthenticated$.pipe(
    take(1),
    switchMap(isAuthenticated => {
      if (!isAuthenticated) {
        return next(req);
      }
      
      return auth0.user$.pipe(
        take(1),
        switchMap(user => {
          if (user) {
            // Try multiple possible claim names for tenant ID
            const tenantId = user['https://ss-app.com/tenantId'] || 
                            user['tenantId'] || 
                            user['tenant_id'] ||
                            user['https://api.siteshield.com/tenantId'];
            // Only add tenant header if tenant ID exists in claims
            // If not found, let backend resolve it from authenticated user
            if (tenantId) {
              req = req.clone({
                setHeaders: {
                  'X-Tenant-Id': tenantId.toString()
                }
              });
            } else {
              // No tenant claim found in Auth0 token.
              // The backend resolves the tenant from the authenticated user — this is safe,
              // but log a warning in non-production so missing Action config is caught early.
              logger.warn(
                'TenantInterceptor: No tenantId claim found in user token. ' +
                'Backend will resolve tenant from authenticated user. ' +
                'If this is unexpected, check your Auth0 Action configuration.'
              );
            }
          }
          return next(req);
        })
      );
    }),
    catchError((error) => {
      // Don't log 401/403 errors - they're expected for unauthenticated requests or authorization issues
      // Also don't log consent errors - they're part of normal Auth0 flow
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        return next(req);
      }
      // Only log unexpected errors
      if (!error?.message?.includes('Consent required')) {
        logger.errorWithPrefix('Tenant Interceptor', 'Error getting user', error);
      }
      return next(req);
    })
  );
};
