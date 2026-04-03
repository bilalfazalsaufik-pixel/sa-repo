import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { RedirectToDashboardComponent } from './core/components/redirect-to-dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: RedirectToDashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard/site/:id',
    loadComponent: () => import('./features/dashboard/components/site-detail/site-detail.component').then(m => m.SiteDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'zones',
    loadComponent: () => import('./features/zones/components/zone-list/zone-list.component').then(m => m.ZoneListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sites',
    loadComponent: () => import('./features/sites/components/site-list/site-list.component').then(m => m.SiteListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'devices',
    loadComponent: () => import('./features/devices/components/device-list/device-list.component').then(m => m.DeviceListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sensors',
    loadComponent: () => import('./features/sensors/components/sensor-list/sensor-list.component').then(m => m.SensorListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'regtypes',
    loadComponent: () => import('./features/regtypes/components/regtype-list/regtype-list.component').then(m => m.RegTypeListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'eventtypes',
    loadComponent: () => import('./features/eventtypes/components/eventtype-list/eventtype-list.component').then(m => m.EventTypeListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'events',
    loadComponent: () => import('./features/events/components/event-list/event-list.component').then(m => m.EventListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'readings',
    loadComponent: () => import('./features/readings/components/reading-list/reading-list.component').then(m => m.ReadingListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'maintenance',
    loadComponent: () => import('./features/maintenance/components/maintenance-list/maintenance-list.component').then(m => m.MaintenanceListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./features/users/components/user-list/user-list.component').then(m => m.UserListComponent),
    canActivate: [authGuard, permissionGuard('View Users', 'Manage Users')]
  },
  {
    path: 'roles',
    loadComponent: () => import('./features/roles/components/role-list/role-list.component').then(m => m.RoleListComponent),
    canActivate: [authGuard, permissionGuard('View Roles', 'Manage Roles')]
  },
  {
    path: 'roles/permissions/:roleId',
    loadComponent: () => import('./features/roles/components/manage-permissions/manage-permissions.component').then(m => m.ManagePermissionsComponent),
    canActivate: [authGuard, permissionGuard('Manage Roles')]
  },
  {
    path: 'tenants',
    loadComponent: () => import('./features/tenants/components/client-list/client-list.component').then(m => m.TenantListComponent),
    canActivate: [authGuard, permissionGuard('View Tenants', 'Manage Tenants')]
  },
  {
    path: 'notifications',
    loadComponent: () => import('./features/notifications/components/notification-list/notification-list.component').then(m => m.NotificationListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'notification-history',
    loadComponent: () => import('./features/notifications/components/notification-history-list/notification-history-list.component').then(m => m.NotificationHistoryListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'support',
    loadComponent: () => import('./features/support/components/support-page/support-page.component').then(m => m.SupportPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/components/settings-page/settings-page.component').then(m => m.SettingsPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/user/components/user-profile/user-profile.component').then(m => m.UserProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/components/login/login.component').then(m => m.LoginComponent)
  }
];
