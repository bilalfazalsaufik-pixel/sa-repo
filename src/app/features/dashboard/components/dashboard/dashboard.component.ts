import { Component, OnInit, ChangeDetectionStrategy, ViewEncapsulation, inject, DestroyRef, Injector, signal, computed } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardService } from '../../services/dashboard.service';
import { SiteService } from '../../../sites/services/site.service';
import { DashboardData, GetDashboardDataParams, SiteOverview } from '../../../../shared/models/dashboard.model';
import { Site } from '../../../../shared/models/site.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { SitesMapComponent } from '../../../../shared/components/sites-map/sites-map.component';
import { SiteMapItem } from '../../../../shared/models/site-map.model';
import { AutoRefreshService } from '../../../../shared/services/auto-refresh.service';
import { getStatusSeverity } from '../../../../shared/utils/site-status';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    TooltipModule,
    ErrorMessageComponent,
    LoadingSpinnerComponent,
    SitesMapComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  providers: [AutoRefreshService]
})
export class DashboardComponent implements OnInit {
  dashboardData = signal<DashboardData | null>(null);
  lastUpdated = signal<Date | null>(null);

  // Site Overview pagination
  currentPage = signal<number>(0);
  itemsPerPage = signal<number>(10);

  // Dropdown options
  sites = signal<Site[]>([]);

  private dashboardService = inject(DashboardService);
  private siteService = inject(SiteService);
  private permissionService = inject(PermissionService);
  private router = inject(Router);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  autoRefresh = inject(AutoRefreshService);

  // Permission checks
  canViewDashboard = computed(() => this.permissionService.hasPermission('View Sites'));

  // Computed signals
  summary = computed(() => this.dashboardData()?.summary);
  siteOverview = computed(() => this.dashboardData()?.siteOverview ?? []);

  // Summary counts
  normalSites = computed(() => this.summary()?.greenSites ?? 0);
  alarmedSites = computed(() => (this.summary()?.redSites ?? 0) + (this.summary()?.yellowSites ?? 0));

  // Map data: cross-join sites (lat/lon) with dashboard overview (status)
  siteMapItems = computed((): SiteMapItem[] => {
    const statusMap = new Map(this.siteOverview().map(o => [o.siteId, o.status]));
    return this.sites()
      .filter(s => s.latitude != null && s.longitude != null)
      .map(s => ({
        siteId: s.id,
        name: s.name,
        latitude: s.latitude!,
        longitude: s.longitude!,
        status: statusMap.get(s.id)
      }));
  });

  ngOnInit(): void {
    // Both loadSites() and loadDashboardData() require the user to exist in the database.
    // For a brand-new user, the database record is created by AppComponent's syncUser() call,
    // which sets permissionsLoaded to true when it completes. Waiting here prevents a race
    // where loadSites() fires before sync finishes, causing 401 "User not found in system"
    // → error interceptor → redirect to /login → infinite loop.
    if (this.permissionService.permissionsLoaded()) {
      this.loadSites();
      this.loadDashboardData();
    } else {
      toObservable(this.permissionService.permissionsLoaded, { injector: this.injector })
        .pipe(filter(loaded => loaded), take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.loadSites();
          this.loadDashboardData();
        });
    }

    this.autoRefresh.start(
      () => { if (!this.loadingService.loading()) this.loadDashboardData(); },
      60_000
    );
  }

  loadSites(): void {
    this.siteService.getSites({ pageNumber: 1, pageSize: 1000 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.sites.set(result.items);
        },
        error: (err) => this.errorService.setErrorFromHttp(err)
      });
  }

  loadDashboardData(): void {
    if (!this.canViewDashboard()) {
      this.errorService.setError('You do not have permission to view dashboard.');
      return;
    }

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    const params: GetDashboardDataParams = {};

    this.dashboardService.getDashboardData(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.dashboardData.set(data);
          this.lastUpdated.set(new Date());
          this.loadingService.setLoading(false);
        },
        error: (err) => {
          this.errorService.setErrorFromHttp(err);
          this.loadingService.setLoading(false);
        }
      });
  }

  viewSiteDetails(siteId: number): void {
    // Navigate to site detail page with Engineering/Operator views
    this.router.navigate(['/dashboard/site', siteId]);
  }

  // Pagination
  onPageChange(event: any): void {
    this.currentPage.set(event.page ?? 0);
    this.itemsPerPage.set(event.rows ?? 10);
  }

  getStatusSeverity = getStatusSeverity;

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Green': return 'pi pi-check-circle';
      case 'Yellow': return 'pi pi-exclamation-triangle';
      case 'Red': return 'pi pi-times-circle';
      default: return 'pi pi-info-circle';
    }
  }

  getHealthPercentage(): number {
    const total = this.normalSites() + this.alarmedSites();
    if (total === 0) return 100;
    return Math.round((this.normalSites() / total) * 100);
  }

  trackBySiteId(index: number, site: SiteOverview): number {
    return site.siteId;
  }

  toggleAutoRefresh(): void {
    this.autoRefresh.toggle();
  }

  clearError = (): void => {
    this.errorService.clearError();
  };
}
