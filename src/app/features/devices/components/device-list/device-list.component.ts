import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { DeviceService } from '../../services/device.service';
import { SiteService } from '../../../sites/services/site.service';
import { ZoneService } from '../../../zones/services/zone.service';
import { Device, CreateDeviceRequest, UpdateDeviceRequest } from '../../../../shared/models/device.model';
import { Site } from '../../../../shared/models/site.model';
import { Zone } from '../../../../shared/models/zone.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    TooltipModule,
    ModalComponent,
    ErrorMessageComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './device-list.component.html',
  styleUrls: ['./device-list.component.css']
})
export class DeviceListComponent implements OnInit {
  devices = signal<Device[]>([]);
  sites = signal<Site[]>([]);
  zones = signal<Zone[]>([]);
  totalRecords = signal(0);
  pageSize = signal(10);
  showModal = signal(false);
  editingDevice = signal<Device | null>(null);
  sortField = signal<string | null>(null);
  sortOrder = signal<number>(1);
  /** Filter: 'all' | 'zone:ID' | 'site:ID' */
  siteFilterValue = 'all';
  filterName = '';
  filterIp = '';
  tableFirst = signal(0);
  formData: { name: string; ip?: string; siteId: number | null } = { name: '', siteId: null };
  private isLoading = false;
  private lastLoadParams: {
    pageNumber: number;
    pageSize: number;
    siteId?: number;
    zoneId?: number;
    sortField?: string | null;
    sortOrder?: number;
    nameSearch?: string;
    ipSearch?: string;
  } | null = null;
  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  private deviceService = inject(DeviceService);
  private siteService = inject(SiteService);
  private zoneService = inject(ZoneService);
  private permissionService = inject(PermissionService);
  private confirmationService = inject(ConfirmationService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  // Permission checks
  canManageDevices = computed(() => this.permissionService.hasPermission('Manage Devices'));

  // Computed dropdown options for create/edit form
  siteOptions = computed(() =>
    this.sites().map(s => ({ label: `${s.name} (${s.zoneName})`, value: s.id }))
  );

  // Filter options: All sites | All sites of Zone X | each site
  siteFilterOptions = computed(() => {
    const opts: { label: string; value: string }[] = [{ label: 'All sites', value: 'all' }];
    for (const z of this.zones()) {
      opts.push({ label: `All sites of ${z.name}`, value: `zone:${z.id}` });
    }
    for (const s of this.sites()) {
      opts.push({ label: `${s.name} (${s.zoneName})`, value: `site:${s.id}` });
    }
    return opts;
  });

  ngOnInit(): void {
    this.loadZonesAndSitesForFilter();
  }

  loadZonesAndSitesForFilter(): void {
    if (this.zones().length === 0) {
      this.zoneService.getZones({ pageNumber: 1, pageSize: 1000 })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(result => this.zones.set(result.items));
    }
    if (this.sites().length === 0) {
      this.siteService.getSites({ pageNumber: 1, pageSize: 1000 })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(result => this.sites.set(result.items));
    }
  }

  loadSites(): void {
    if (this.sites().length === 0) {
      this.siteService.getSites({ pageNumber: 1, pageSize: 1000 })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(result => this.sites.set(result.items));
    }
  }

  private parseFilter(f: string): { siteId?: number; zoneId?: number } {
    if (!f || f === 'all') return {};
    if (f.startsWith('zone:')) return { zoneId: +f.slice(5) };
    if (f.startsWith('site:')) return { siteId: +f.slice(5) };
    return {};
  }

  onFilterChange(): void {
    if (this.filterDebounceTimer) clearTimeout(this.filterDebounceTimer);
    this.filterDebounceTimer = setTimeout(() => {
      this.tableFirst.set(0);
      this.lastLoadParams = null;
      this.loadDevices(1, this.pageSize());
    }, 300);
  }

  loadDevices(pageNumber: number, pageSize: number): void {
    if (this.isLoading) return;
    const { siteId, zoneId } = this.parseFilter(this.siteFilterValue);
    const sf = this.sortField();
    const so = this.sortOrder();
    const nameSearch = this.filterName.trim() || undefined;
    const ipSearch = this.filterIp.trim() || undefined;
    if (this.lastLoadParams &&
        this.lastLoadParams.pageNumber === pageNumber &&
        this.lastLoadParams.pageSize === pageSize &&
        this.lastLoadParams.siteId === siteId &&
        this.lastLoadParams.zoneId === zoneId &&
        this.lastLoadParams.sortField === sf &&
        this.lastLoadParams.sortOrder === so &&
        this.lastLoadParams.nameSearch === nameSearch &&
        this.lastLoadParams.ipSearch === ipSearch) {
      return;
    }

    this.lastLoadParams = { pageNumber, pageSize, siteId, zoneId, sortField: sf, sortOrder: so, nameSearch, ipSearch };
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.errorService.clearError();

    this.deviceService.getDevices({
      siteId,
      zoneId,
      sortField: sf ?? undefined,
      sortOrder: so,
      nameSearch,
      ipSearch,
      pageNumber,
      pageSize
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.devices.set(result.items);
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
    this.editingDevice.set(null);
    this.formData = { name: '', siteId: null };
    this.showModal.set(true);
  }

  editDevice(device: Device): void {
    this.editingDevice.set(device);
    this.formData = { name: device.name, ip: device.ip || '', siteId: device.siteId };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingDevice.set(null);
    this.formData = { name: '', siteId: null };
  }

  private static readonly IP_PATTERN = /^([0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  saveDevice(): void {
    if (!this.formData.name.trim() || !this.formData.siteId) {
      this.errorService.setError('Name and Site are required');
      return;
    }
    if (this.formData.ip && !DeviceListComponent.IP_PATTERN.test(this.formData.ip)) {
      this.errorService.setError('IP address must be a valid IPv4 or IPv6 address');
      return;
    }

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    if (this.editingDevice()) {
      const request: UpdateDeviceRequest = {
        id: this.editingDevice()!.id,
        name: this.formData.name,
        ip: this.formData.ip,
        siteId: this.formData.siteId!
      };
      this.deviceService.updateDevice(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Device updated successfully.');
            this.lastLoadParams = null;
            this.loadDevices(1, this.pageSize());
            this.closeModal();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    } else {
      const request: CreateDeviceRequest = {
        name: this.formData.name,
        ip: this.formData.ip,
        siteId: this.formData.siteId!
      };
      this.deviceService.createDevice(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Device created successfully.');
            this.lastLoadParams = null;
            this.loadDevices(1, this.pageSize());
            this.closeModal();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    }
  }

  deleteDevice(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this device?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingService.setLoading(true);
        this.errorService.clearError();
        this.deviceService.deleteDevice(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.errorService.setSuccess('Device deleted successfully.');
              this.lastLoadParams = null;
              this.loadDevices(1, this.pageSize());
            },
            error: (err) => {
              this.errorService.setErrorFromHttp(err);
              this.loadingService.setLoading(false);
            }
          });
      }
    });
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
    const { siteId, zoneId } = this.parseFilter(this.siteFilterValue);
    const nameSearch = this.filterName.trim() || undefined;
    const ipSearch = this.filterIp.trim() || undefined;
    if (!this.lastLoadParams ||
        this.lastLoadParams.pageNumber !== pageNumber ||
        this.lastLoadParams.pageSize !== pageSize ||
        this.lastLoadParams.siteId !== siteId ||
        this.lastLoadParams.zoneId !== zoneId ||
        this.lastLoadParams.sortField !== sf ||
        this.lastLoadParams.sortOrder !== so ||
        this.lastLoadParams.nameSearch !== nameSearch ||
        this.lastLoadParams.ipSearch !== ipSearch) {
      this.loadDevices(pageNumber, pageSize);
    }
  }

  trackByDeviceId(index: number, device: Device): number {
    return device.id;
  }
}
