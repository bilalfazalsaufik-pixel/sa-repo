import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { AuthService } from '../../core/services/auth.service';
import { SidebarService } from '../services/sidebar.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { MenuItem } from 'primeng/api';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MenuModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/devices': 'Devices',
  '/zones': 'Zones',
  '/sites': 'Sites',
  '/sensors': 'Sensors',
  '/readings': 'Readings',
  '/events': 'Events',
  '/maintenance': 'Maintenance',
  '/users': 'Users',
  '/roles': 'Roles',
  '/tenants': 'Tenants',
  '/notifications': 'Notifications',
  '/profile': 'My Profile',
  '/settings': 'Settings',
  '/support': 'Support',
};

export class HeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  protected sidebarService = inject(SidebarService);

  private user$ = toSignal(this.authService.user$, { initialValue: null });

  private currentUrl$ = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  pageTitle = computed(() => {
    const url = this.currentUrl$() ?? '';
    const segment = '/' + (url.split('/')[1] ?? '');
    return ROUTE_TITLES[segment] ?? 'Dashboard';
  });
  
  user = computed(() => {
    const authUser = this.user$();
    if (!authUser) return null;
    return {
      name: authUser.name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email || '',
      initial: (authUser.name || authUser.email || 'U')[0].toUpperCase()
    };
  });

  userMenuItems = computed<MenuItem[]>(() => [
    {
      label: 'Profile',
      icon: 'pi pi-user',
      routerLink: '/profile'
    },
    {
      separator: true
    },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    }
  ]);

  logout(): void {
    this.authService.logout();
  }
}
