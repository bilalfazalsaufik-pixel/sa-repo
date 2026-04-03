import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { SidebarService } from '../services/sidebar.service';
import { toSignal, takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, catchError, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { TenantService } from '../../features/tenants/services/tenant.service';
import { Tenant } from '../../shared/models/tenant.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private permissionService = inject(PermissionService);
  private router = inject(Router);
  protected sidebarService = inject(SidebarService);
  private tenantService = inject(TenantService);

  isCollapsed = this.sidebarService.isCollapsed;
  permissionsLoaded = this.permissionService.permissionsLoaded;
  tenantName = this.permissionService.tenantName;
  private user$ = toSignal(this.authService.user$, { initialValue: null });

  /** Tenants list for SuperAdmin Users submenu — loaded after sync so user exists in DB */
  tenantList = toSignal(
    toObservable(this.permissionService.permissionsLoaded).pipe(
      filter(loaded => loaded),
      take(1),
      switchMap(() => this.tenantService.getTenants(1, 500).pipe(
        map(r => r.items),
        catchError(() => of<Tenant[]>([]))
      ))
    ),
    { initialValue: [] as Tenant[] }
  );

  // Submenu state management - Devices menu open by default
  private openSubmenus = signal<Set<string>>(new Set(['devices']));

  // Track which submenu is open in collapsed mode
  private openCollapsedSubmenu = signal<string | null>(null);

  user = computed(() => {
    const authUser = this.user$();
    if (!authUser) return null;
    return {
      name: authUser.name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email || '',
      initial: (authUser.name || authUser.email || 'U')[0].toUpperCase()
    };
  });

  constructor() {
    // Auto-expand submenus based on active routes
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.autoExpandActiveSubmenu();
      });

    // Initial auto-expand (needed for first-load state before any NavigationEnd fires)
    this.autoExpandActiveSubmenu();
  }

  // Auto-expand submenu if a child route is active
  private autoExpandActiveSubmenu(): void {
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    // Always keep devices menu open by default
    const openMenus = new Set<string>(['devices']);

    // Check which submenu should be open based on current route
    if (['/devices', '/zones', '/sites', '/sensors', '/readings'].some(route =>
      currentUrl === route || currentUrl.startsWith(route + '/'))) {
      openMenus.add('devices');
    }

    if (['/users'].some(route => currentUrl === route || currentUrl.startsWith(route + '/'))) {
      openMenus.add('users');
    }

    if (['/eventtypes', '/regtypes', '/tenants', '/roles'].some(route =>
      currentUrl === route || currentUrl.startsWith(route + '/'))) {
      openMenus.add('adminSettings');
    }

    this.openSubmenus.set(openMenus);
  }

  // Toggle submenu open/close
  toggleSubmenu(submenuKey: string, defaultRoute?: string): void {
    // When collapsed, toggle the collapsed submenu popup
    if (this.isCollapsed()) {
      const currentOpen = this.openCollapsedSubmenu();
      if (currentOpen === submenuKey) {
        this.openCollapsedSubmenu.set(null); // Close if already open
      } else {
        this.openCollapsedSubmenu.set(submenuKey); // Open this submenu
      }
      return;
    }

    // When expanded, normal toggle behavior
    const current = new Set(this.openSubmenus());
    if (current.has(submenuKey)) {
      current.delete(submenuKey);
    } else {
      current.add(submenuKey);
    }
    this.openSubmenus.set(current);
  }

  // Check if collapsed submenu is open
  isCollapsedSubmenuOpen(submenuKey: string): boolean {
    return this.openCollapsedSubmenu() === submenuKey;
  }

  // Close collapsed submenu (called on outside click)
  closeCollapsedSubmenu(): void {
    this.openCollapsedSubmenu.set(null);
  }

  // Check if submenu is open
  isSubmenuOpen(submenuKey: string): boolean {
    return this.openSubmenus().has(submenuKey);
  }

  // Helper methods for permissions
  hasPermission(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  hasRole(role: string): boolean {
    return this.permissionService.hasRole(role);
  }

  // Toggle sidebar collapse
  toggleCollapse(): void {
    this.sidebarService.toggle();
    // Close all submenus when collapsing
    if (this.sidebarService.isCollapsed()) {
      this.openSubmenus.set(new Set());
    } else {
      // Re-expand active submenu when expanding
      this.autoExpandActiveSubmenu();
    }
  }

  // Logout
  logout(): void {
    this.authService.logout();
  }

  // Handle clicks outside the sidebar to close collapsed submenu
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isCollapsed() || !this.openCollapsedSubmenu()) return;

    const target = event.target as HTMLElement;
    const sidebar = target.closest('.sidebar');

    // If click is outside sidebar, close the collapsed submenu
    if (!sidebar) {
      this.closeCollapsedSubmenu();
    }
  }
}
