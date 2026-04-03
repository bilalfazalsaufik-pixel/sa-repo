import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { LayoutComponent } from './layout/layout.component';
import { AuthService } from './core/services/auth.service';
import { PermissionService } from './core/services/permission.service';
import { LoggerService } from './core/services/logger.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, switchMap, catchError, take } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LayoutComponent],
  template: `
    <app-layout></app-layout>
  `
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  private permissionService = inject(PermissionService);
  private titleService = inject(Title);
  private logger = inject(LoggerService);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Sync user after authentication and set permissions
    // Wait for authentication, user, and ensure we attempt to get token before syncing
    this.authService.isAuthenticated$
      .pipe(
        filter(isAuthenticated => isAuthenticated),
        switchMap(() => this.authService.user$),
        filter(user => !!user),
        take(1),
        // Try to get token to ensure it's available (but don't block if it fails - syncUser will handle it)
        switchMap(() => {
          // Attempt to get token to warm up the cache, but don't fail if it's not ready yet
          return this.authService.accessToken$.pipe(
            take(1),
            catchError(() => of(null)), // If token fails, continue anyway - syncUser will handle it
            switchMap(() => this.authService.syncUser())
          );
        }),
        catchError((error) => {
          // Don't log 401/403 errors - they're expected if user isn't authenticated, needs consent, or has authorization issues
          // Also don't log consent errors - they're part of normal Auth0 flow
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
            return of(null);
          }
          if (!error?.message?.includes('Consent required') &&
              !error?.message?.includes('Missing Refresh Token')) {
            this.logger.errorWithPrefix('AppComponent', 'Failed to sync user', error);
          }
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (response?.permissions) {
            this.permissionService.setPermissions(response.permissions);
          }
          if (response?.roles) {
            this.permissionService.setRoles(response.roles);
          }
          if (response?.tenantName) {
            this.permissionService.setTenantName(response.tenantName);
            this.titleService.setTitle(`${response.tenantName} Dashboard`);
          }
          if (response?.userId) {
            this.permissionService.setCurrentUserId(response.userId);
          }
        }
      });
  }
}
