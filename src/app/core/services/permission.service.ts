import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private permissions = signal<Set<string>>(new Set());
  private roles = signal<Set<string>>(new Set());
  private _tenantName = signal<string>('');
  private _currentUserId = signal<number | null>(null);

  /** True once setPermissions() has been called for the first time (permissions loaded from server). */
  readonly permissionsLoaded = signal(false);

  /** The database ID of the currently logged-in user. Set after syncUser() completes. */
  readonly currentUserId = this._currentUserId.asReadonly();

  /** The name of the tenant the current user belongs to. */
  readonly tenantName = this._tenantName.asReadonly();

  /**
   * Expose permissions as a readonly signal for components to observe
   */
  readonly permissions$ = this.permissions.asReadonly();

  /**
   * Expose roles as a readonly signal for components to observe
   */
  readonly roles$ = this.roles.asReadonly();

  /**
   * Check if user has a specific permission.
   * For "View X", returns true if user has "View X" OR "Manage X".
   */
  hasPermission(permission: string): boolean {
    const userPermissions = this.permissions();
    if (userPermissions.has(permission)) return true;
    if (permission.startsWith('View ')) {
      const manageName = 'Manage ' + permission.slice(5);
      if (userPermissions.has(manageName)) return true;
    }
    return false;
  }

  /**
   * Check if user has any of the specified permissions.
   * Delegates to {@link hasPermission} so the "View X satisfied by Manage X" fallback applies.
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Get all user permissions
   */
  getPermissions(): string[] {
    return Array.from(this.permissions());
  }

  /**
   * Manually set permissions (useful for testing or manual updates)
   */
  setPermissions(permissions: string[]): void {
    this.permissions.set(new Set(permissions));
    this.permissionsLoaded.set(true);
  }

  setCurrentUserId(id: number): void {
    this._currentUserId.set(id);
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    return this.roles().has(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.roles();
    return roles.some(role => userRoles.has(role));
  }

  /**
   * Manually set roles (useful for testing or manual updates)
   */
  setRoles(roles: string[]): void {
    this.roles.set(new Set(roles));
  }

  setTenantName(name: string): void {
    this._tenantName.set(name);
  }

  /**
   * Clear all user permissions and roles.
   * This should be called on logout.
   */
  clearPermissions(): void {
    this.permissions.set(new Set());
    this.roles.set(new Set());
    this._tenantName.set('');
    this._currentUserId.set(null);
    this.permissionsLoaded.set(false);
  }
}
