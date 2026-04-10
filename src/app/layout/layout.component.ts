import { Component, ChangeDetectionStrategy, inject, computed, signal, OnInit, DestroyRef, Injector } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, startWith, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/services/auth.service';
import { PermissionService } from '../core/services/permission.service';
import { ThemeService } from '../core/services/theme.service';
import { SidebarComponent } from './sidebar/sidebar.component';
import { SidebarService } from './services/sidebar.service';
import { EventService } from '../features/events/services/event.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';

interface SectionInfo { label: string; icon: string; }

const SECTION_MAP: Record<string, SectionInfo> = {
  '/dashboard':   { label: 'Dashboard',      icon: 'pi-home' },
  '/devices':     { label: 'Devices',         icon: 'pi-desktop' },
  '/zones':       { label: 'Devices',         icon: 'pi-desktop' },
  '/sites':       { label: 'Devices',         icon: 'pi-desktop' },
  '/sensors':     { label: 'Devices',         icon: 'pi-desktop' },
  '/readings':    { label: 'Devices',         icon: 'pi-desktop' },
  '/events':      { label: 'Events',          icon: 'pi-exclamation-triangle' },
  '/maintenance': { label: 'Maintenance',     icon: 'pi-wrench' },
  '/users':       { label: 'Users',           icon: 'pi-users' },
  '/notifications':{ label: 'Notifications', icon: 'pi-bell' },
  '/tenants':     { label: 'Admin Settings',  icon: 'pi-sliders-h' },
  '/roles':       { label: 'Admin Settings',  icon: 'pi-sliders-h' },
  '/eventtypes':  { label: 'Admin Settings',  icon: 'pi-sliders-h' },
  '/regtypes':    { label: 'Admin Settings',  icon: 'pi-sliders-h' },
  '/profile':     { label: 'Profile',         icon: 'pi-user' },
};

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, AsyncPipe, SidebarComponent, ConfirmDialogModule, MenuModule, BadgeModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-confirmDialog></p-confirmDialog>
    @if (isAuthenticated$ | async) {
      <app-sidebar />
      <main class="main-content" [class.sidebar-collapsed]="sidebarService.isCollapsed()">
        <div class="sticky-header">
          <div class="sticky-header-left">
            <span class="section-label">{{ currentSection().label }}</span>
          </div>
          <div class="sticky-header-right">
            <button
              class="theme-toggle-btn"
              (click)="themeService.toggle()"
              [title]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
              aria-label="Toggle theme">
              <i class="pi" [class.pi-sun]="themeService.isDark()" [class.pi-moon]="!themeService.isDark()"></i>
            </button>
            <button class="bell-btn" (click)="goToEvents()"
                    pTooltip="Unresolved Events" tooltipPosition="bottom"
                    [attr.aria-label]="unresolvedCount() > 0 ? unresolvedCount() + ' unresolved events' : 'No unresolved events'">
              <i class="pi pi-bell"></i>
              @if (unresolvedCount() > 0) {
                <span class="bell-badge">{{ unresolvedCount() > 99 ? '99+' : unresolvedCount() }}</span>
              }
            </button>
            <p-menu #userMenu [model]="userMenuItems()" [popup]="true" appendTo="body"
                    styleClass="user-dropdown-menu"></p-menu>
            @if (currentUser(); as u) {
              <button type="button" class="user-btn" (click)="userMenu.toggle($event)">
                <span class="user-avatar"><i class="pi pi-user"></i></span>
                <span class="user-name">{{ u.name }}</span>
                <i class="pi pi-chevron-down user-chevron"></i>
              </button>
            }
          </div>
        </div>
        <div class="main-content-wrapper">
          <router-outlet></router-outlet>
        </div>
      </main>
    } @else {
      <router-outlet></router-outlet>
    }
  `,
  styles: [`
    .main-content {
      margin-left: 258px;
      background-color: var(--main-bg, #0a1929);
      transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      height: 100%;
      overflow: auto;
      display: flex;
      flex-direction: column;
    }
    .main-content.sidebar-collapsed {
      margin-left: 70px;
    }
    .sticky-header {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      height: 56px;
      min-height: 56px;
      background: var(--header-bg, rgba(13, 31, 45, 0.92));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 0px 3px rgb(0 0 0 / 8%);
    }
    .sticky-header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .sticky-header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section-icon {
      font-size: 1.25rem;
      color: var(--brand-primary, #00d9a3);
    }
    .section-label {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-primary, #ffffff);
      letter-spacing: 0.01em;
    }
    .theme-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: var(--user-btn-bg, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--user-btn-border, rgba(255, 255, 255, 0.12));
      color: var(--text-secondary, rgba(255, 255, 255, 0.6));
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.9rem;
      flex-shrink: 0;
    }
    .theme-toggle-btn:hover {
      background: rgba(0, 217, 163, 0.1);
      border-color: rgba(0, 217, 163, 0.35);
      color: var(--brand-primary, #00d9a3);
    }
    .user-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      background: var(--user-btn-bg, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--user-btn-border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      color: var(--user-btn-color, rgba(255, 255, 255, 0.85));
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      white-space: nowrap;
    }
    .user-btn:hover {
      background: rgba(0, 217, 163, 0.1);
      border-color: rgba(0, 217, 163, 0.35);
      color: #00d9a3;
    }
    .user-avatar {
      width: 24px;
      height: 24px;
      background: rgba(0, 217, 163, 0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      color: #00d9a3;
      flex-shrink: 0;
    }
    .user-name {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .user-chevron {
      font-size: 0.6rem;
      opacity: 0.55;
    }
    .bell-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: var(--user-btn-bg, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--user-btn-border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      color: var(--text-secondary, rgba(255, 255, 255, 0.7));
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .bell-btn:hover {
      background: rgba(0, 217, 163, 0.1);
      border-color: rgba(0, 217, 163, 0.35);
      color: #00d9a3;
    }
    .bell-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      background: #ef4444;
      border-radius: 9px;
      font-size: 0.65rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      border: 2px solid var(--header-bg, #0a1929);
    }
    .main-content-wrapper {
      padding: 20px 24px;
      flex: 1;
    }
    :host ::ng-deep .p-card {
      box-shadow: none;
    }
    /* ---- Light theme sticky header ---- */
    :host-context(html.light-theme) .sticky-header {
      --header-bg: rgb(246, 246, 246);
      --brand-primary: #00b890;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --user-btn-bg: rgba(0, 0, 0, 0.05);
      --user-btn-border: rgba(0, 0, 0, 0.12);
      --user-btn-color: #1e293b;
    }
  `]
})
export class LayoutComponent implements OnInit {
  protected authService = inject(AuthService);
  protected sidebarService = inject(SidebarService);
  protected themeService = inject(ThemeService);
  private router = inject(Router);
  private eventService = inject(EventService);
  private permissionService = inject(PermissionService);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);

  isAuthenticated$ = this.authService.isAuthenticated$;
  unresolvedCount = signal(0);

  ngOnInit(): void {
    // Delay all API calls until syncUser() completes and the user exists in the database.
    // Firing getUnresolvedEventsCount() before sync finishes causes 401 "User not found in
    // system", which the error interceptor turns into a /login redirect → infinite loop.
    if (this.permissionService.permissionsLoaded()) {
      this.startPolling();
    } else {
      toObservable(this.permissionService.permissionsLoaded, { injector: this.injector })
        .pipe(filter(loaded => loaded), take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.startPolling());
    }
  }

  private startPolling(): void {
    this.loadUnresolvedCount();
    const interval = setInterval(() => this.loadUnresolvedCount(), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
    this.eventService.eventMutated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadUnresolvedCount());
  }

  private loadUnresolvedCount(): void {
    this.eventService.getUnresolvedEventsCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (count) => this.unresolvedCount.set(count), error: () => {} });
  }

  goToEvents(): void {
    this.router.navigate(['/events']);
  }


  private user$ = toSignal(this.authService.user$, { initialValue: null });

  currentUser = computed(() => {
    const u = this.user$();
    if (!u) return null;
    return { name: u.name || u.email?.split('@')[0] || 'User' };
  });

  userMenuItems = computed<MenuItem[]>(() => [
    { label: 'Profile', icon: 'pi pi-user', command: () => this.router.navigate(['/profile']) },
    { separator: true },
    { label: 'Logout', icon: 'pi pi-sign-out', command: () => this.authService.logout() }
  ]);

  private url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects.split('?')[0]),
      startWith(this.router.url.split('?')[0])
    )
  );

  currentSection = computed((): SectionInfo => {
    const url = this.url() ?? '/';
    const match = Object.keys(SECTION_MAP).find(k => url === k || url.startsWith(k + '/'));
    return match ? SECTION_MAP[match] : { label: 'ETSW', icon: 'pi-building' };
  });
}
