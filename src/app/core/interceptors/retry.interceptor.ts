import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Don't retry for POST, PUT, DELETE requests (idempotency concerns)
  if (req.method !== 'GET') {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: 3,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // NEVER retry 401/403 errors - these indicate authentication/authorization failures
        if (error.status === 401 || error.status === 403) {
          return throwError(() => error);
        }

        // Only retry network errors or 5xx errors
        if (error.status === 0 || (error.status >= 500 && error.status < 600)) {
          // Exponential backoff: 1s, 2s, 4s
          return timer(Math.pow(2, retryCount - 1) * 1000);
        }
        return throwError(() => error);
      }
    })
  );
};
