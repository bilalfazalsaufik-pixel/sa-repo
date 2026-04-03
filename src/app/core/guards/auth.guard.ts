import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { combineLatest, filter, map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const auth0 = inject(AuthService);
  const router = inject(Router);

  // Wait until Auth0 finishes its internal auth check (isLoading$ becomes false)
  // before reading isAuthenticated$. Without this, take(1) can fire on the initial
  // "false" emission that Auth0 emits while still loading, causing authenticated users
  // to be incorrectly redirected to /login on page refresh.
  return combineLatest([auth0.isAuthenticated$, auth0.isLoading$]).pipe(
    filter(([, isLoading]) => !isLoading),
    take(1),
    map(([isAuthenticated]) => {
      if (!isAuthenticated) {
        const returnUrl = state.url && state.url !== '/' ? state.url : '/dashboard';
        router.navigate(['/login'], { queryParams: { returnUrl }, replaceUrl: true });
        return false;
      }
      return true;
    })
  );
};
