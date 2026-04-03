import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { PermissionService } from '../services/permission.service';

export function permissionGuard(...requiredPermissions: string[]): CanActivateFn {
  return () => {
    const permissionService = inject(PermissionService);
    const router = inject(Router);

    const evaluate = () => {
      if (permissionService.hasAnyPermission(requiredPermissions)) return true;
      router.navigate(['/dashboard']);
      return false;
    };

    // Fast path: permissions already loaded (covers in-app navigation after login).
    if (permissionService.permissionsLoaded()) {
      return evaluate();
    }

    // Slow path: user navigated directly to a protected URL (page refresh / deep link)
    // before the auth flow finished loading permissions. Wait for the first load signal
    // before deciding, so we don't incorrectly redirect to /dashboard.
    return toObservable(permissionService.permissionsLoaded).pipe(
      filter(loaded => loaded),
      take(1),
      map(() => evaluate())
    );
  };
}
