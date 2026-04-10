import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { SiteService } from '../../services/site.service';
import { ZoneService } from '../../../zones/services/zone.service';
import { Site, CreateSiteRequest, UpdateSiteRequest } from '../../../../shared/models/site.model';
import { Zone } from '../../../../shared/models/zone.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-site-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    TagModule,
    TooltipModule,
    ModalComponent,
    ErrorMessageComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-list.component.html',
  styleUrls: ['./site-list.component.css']
})
export class SiteListComponent implements OnInit {
  sites = signal<Site[]>([]);
  zones = signal<Zone[]>([]);
  totalRecords = signal(0);
  pageSize = signal(10);
  showModal = signal(false);
  editingSite = signal<Site | null>(null);
  sortField = signal<string | null>(null);
  sortOrder = signal<number>(1);
  tableFirst = signal(0);
  filterName = '';
  zoneFilterValue: number | null = null;
  statusFilterValue: string | null = null;
  formData: { name: string; zoneId: number | null; latitude?: number; longitude?: number } = { name: '', zoneId: null };
  private isLoading = false;
  private lastLoadParams: { pageNumber: number; pageSize: number; sortField?: string | null; sortOrder?: number; nameSearch?: string; zoneId?: number | null; statusFilter?: string | null } | null = null;
  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  private siteService = inject(SiteService);
  private zoneService = inject(ZoneService);
  private permissionService = inject(PermissionService);
  private confirmationService = inject(ConfirmationService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  // Permission checks
  canManageSites = computed(() => this.permissionService.hasPermission('Manage Sites'));

  zoneOptions = computed(() =>
    this.zones().map(z => ({ label: z.name, value: z.id }))
  );
  zoneFilterOptions = computed(() =>
    [{ label: 'All zones', value: null as number | null }, ...this.zones().map(z => ({ label: z.name, value: z.id }))]
  );
  statusFilterOptions: { label: string; value: string | null }[] = [
    { label: 'All statuses', value: null },
    { label: 'Green', value: 'Green' },
    { label: 'Yellow', value: 'Yellow' },
    { label: 'Red', value: 'Red' }
  ];

  ngOnInit(): void {
    this.loadZones();
  }

  loadZones(): void {
    // Only load zones if not already loaded (lazy loading for modal)
    if (this.zones().length === 0) {
      this.zoneService.getZones({ pageNumber: 1, pageSize: 1000 })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(result => this.zones.set(result.items));
    }
  }

  onFilterChange(): void {
    if (this.filterDebounceTimer) clearTimeout(this.filterDebounceTimer);
    this.filterDebounceTimer = setTimeout(() => {
      this.tableFirst.set(0);
      this.lastLoadParams = null;
      this.loadSites(1, this.pageSize());
    }, 300);
  }

  loadSites(pageNumber: number, pageSize: number): void {
    if (this.isLoading) return;
    const sf = this.sortField();
    const so = this.sortOrder();
    const nameSearch = this.filterName.trim() || undefined;
    const zoneId = this.zoneFilterValue ?? undefined;
    const statusFilter = this.statusFilterValue ?? undefined;
    if (this.lastLoadParams &&
        this.lastLoadParams.pageNumber === pageNumber &&
        this.lastLoadParams.pageSize === pageSize &&
        this.lastLoadParams.sortField === sf &&
        this.lastLoadParams.sortOrder === so &&
        this.lastLoadParams.nameSearch === nameSearch &&
        this.lastLoadParams.zoneId === (zoneId ?? null) &&
        this.lastLoadParams.statusFilter === (statusFilter ?? null)) {
      return;
    }
    this.lastLoadParams = { pageNumber, pageSize, sortField: sf, sortOrder: so, nameSearch, zoneId: zoneId ?? null, statusFilter: statusFilter ?? null };
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.errorService.clearError();
    this.siteService.getSites({ zoneId, sortField: sf ?? undefined, sortOrder: so, nameSearch, statusFilter, pageNumber, pageSize })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.sites.set(result.items);
          this.totalRecords.set(result.totalCount);
          this.loadingService.setLoading(false);
          this.isLoading = false;
        },
        error: (err) => {
          this.errorService.setErrorFromHttp(err);
          this.loadingService.setLoading(false);
          this.isLoading = false;
          this.lastLoadParams = null;
        }
      });
  }

  showCreateForm(): void {
    this.editingSite.set(null);
    this.formData = { name: '', zoneId: null };
    this.loadZones(); // Load zones when opening modal
    this.showModal.set(true);
  }

  editSite(site: Site): void {
    this.editingSite.set(site);
    this.formData = { name: site.name, zoneId: site.zoneId, latitude: site.latitude || undefined, longitude: site.longitude || undefined };
    this.loadZones(); // Load zones when opening modal
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingSite.set(null);
    this.formData = { name: '', zoneId: null };
  }

  saveSite(): void {
    if (!this.formData.name.trim() || !this.formData.zoneId) {
      this.errorService.setError('Name and Zone are required');
      return;
    }

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    if (this.editingSite()) {
      const request: UpdateSiteRequest = {
        id: this.editingSite()!.id,
        name: this.formData.name,
        zoneId: this.formData.zoneId!,
        latitude: this.formData.latitude,
        longitude: this.formData.longitude
      };
      this.siteService.updateSite(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Site updated successfully.');
            this.lastLoadParams = null;
            this.loadSites(1, this.pageSize());
            this.closeModal();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    } else {
      const request: CreateSiteRequest = {
        name: this.formData.name,
        zoneId: this.formData.zoneId!,
        latitude: this.formData.latitude,
        longitude: this.formData.longitude
      };
      this.siteService.createSite(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Site created successfully.');
            this.lastLoadParams = null;
            this.loadSites(1, this.pageSize());
            this.closeModal();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    }
  }

  deleteSite(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this site?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingService.setLoading(true);
        this.errorService.clearError();
        this.siteService.deleteSite(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.errorService.setSuccess('Site deleted successfully.');
              this.lastLoadParams = null;
              this.loadSites(1, this.pageSize());
            },
            error: (err) => {
              this.errorService.setErrorFromHttp(err);
              this.loadingService.setLoading(false);
            }
          });
      }
    });
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (status?.toLowerCase()) {
      case 'green':
        return 'success';
      case 'yellow':
        return 'warn';
      case 'red':
        return 'danger';
      default:
        return 'info';
    }
  }

  clearError = (): void => {
    this.errorService.clearError();
  };

  onLazyLoad(event: TableLazyLoadEvent): void {
    const pageSize = event.rows ?? 10;
    const first = event.first ?? 0;
    this.tableFirst.set(first);
    const pageNumber = Math.floor(first / pageSize) + 1;
    if (this.pageSize() !== pageSize) this.pageSize.set(pageSize);
    const sf = (event.sortField as string) ?? null;
    const so = (event.sortOrder as number) ?? 1;
    if (sf !== this.sortField() || so !== this.sortOrder()) {
      this.sortField.set(sf);
      this.sortOrder.set(so);
    }
    const nameSearch = this.filterName.trim() || undefined;
    const zoneId = this.zoneFilterValue ?? undefined;
    const statusFilter = this.statusFilterValue ?? undefined;
    if (!this.lastLoadParams ||
        this.lastLoadParams.pageNumber !== pageNumber ||
        this.lastLoadParams.pageSize !== pageSize ||
        this.lastLoadParams.sortField !== sf ||
        this.lastLoadParams.sortOrder !== so ||
        this.lastLoadParams.nameSearch !== nameSearch ||
        this.lastLoadParams.zoneId !== (zoneId ?? null) ||
        this.lastLoadParams.statusFilter !== (statusFilter ?? null)) {
      this.loadSites(pageNumber, pageSize);
    }
  }

  trackBySiteId(index: number, site: Site): number {
    return site.id;
  }
}
