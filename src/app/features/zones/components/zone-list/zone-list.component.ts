import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';

import { ZoneService } from '../../services/zone.service';
import { Zone, CreateZoneRequest, UpdateZoneRequest } from '../../../../shared/models/zone.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { LoggerService } from '../../../../core/services/logger.service';

import { PermissionService } from '../../../../core/services/permission.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-zone-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    TooltipModule,
    ModalComponent, 
    ErrorMessageComponent, 
    LoadingSpinnerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './zone-list.component.html',
  styleUrls: ['./zone-list.component.css']
})
export class ZoneListComponent implements OnInit {
  zones = signal<Zone[]>([]);
  totalRecords = signal(0);
  pageSize = signal(10);
  showModal = signal(false);
  editingZone = signal<Zone | null>(null);
  sortField = signal<string | null>(null);
  sortOrder = signal<number>(1);
  tableFirst = signal(0);
  filterName = '';
  formData: { name: string; description?: string } = { name: '', description: '' };
  private isLoading = false;
  private lastLoadParams: { pageNumber: number; pageSize: number; sortField?: string | null; sortOrder?: number; nameSearch?: string } | null = null;
  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  private zoneService = inject(ZoneService);

  private permissionService = inject(PermissionService);
  private logger = inject(LoggerService);
  private confirmationService = inject(ConfirmationService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  // Permission checks
  canManageZones = computed(() => this.permissionService.hasPermission('Manage Zones'));

  ngOnInit(): void {
    // Initial load is handled by p-table lazy loading
  }

  onFilterChange(): void {
    if (this.filterDebounceTimer) clearTimeout(this.filterDebounceTimer);
    this.filterDebounceTimer = setTimeout(() => {
      this.tableFirst.set(0);
      this.lastLoadParams = null;
      this.loadZones(1, this.pageSize());
    }, 300);
  }

  loadZones(pageNumber: number, pageSize: number): void {
    if (this.isLoading) return;
    const sf = this.sortField();
    const so = this.sortOrder();
    const nameSearch = this.filterName.trim() || undefined;
    if (this.lastLoadParams &&
        this.lastLoadParams.pageNumber === pageNumber &&
        this.lastLoadParams.pageSize === pageSize &&
        this.lastLoadParams.sortField === sf &&
        this.lastLoadParams.sortOrder === so &&
        this.lastLoadParams.nameSearch === nameSearch) {
      return;
    }
    this.lastLoadParams = { pageNumber, pageSize, sortField: sf, sortOrder: so, nameSearch };
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.errorService.clearError();
    this.zoneService.getZones({ sortField: sf ?? undefined, sortOrder: so, nameSearch, pageNumber, pageSize })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.zones.set(result.items);
          this.totalRecords.set(result.totalCount);
          this.loadingService.setLoading(false);
          this.isLoading = false;
        },
        error: (err) => {
          this.logger.errorWithPrefix('ZoneListComponent', 'Error', err);
          this.errorService.setErrorFromHttp(err);
          this.loadingService.setLoading(false);
          this.isLoading = false;
          this.lastLoadParams = null;
        }
      });
  }

  showCreateForm(): void {
    this.editingZone.set(null);
    this.formData = { name: '', description: '' };
    this.showModal.set(true);
  }

  editZone(zone: Zone): void {
    this.editingZone.set(zone);
    this.formData = { name: zone.name, description: zone.description || '' };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingZone.set(null);
    this.formData = { name: '', description: '' };
  }

  saveZone(): void {
    if (!this.formData.name.trim()) {
      this.errorService.setError('Zone name is required');
      return;
    }

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    const zone = this.editingZone();
    
    if (zone) {
      // Update existing
      const request: UpdateZoneRequest = {
        id: zone.id,
        name: this.formData.name.trim(),
        description: this.formData.description?.trim() || undefined
      };
      this.zoneService.updateZone(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Zone updated successfully.');
            this.closeModal();
            this.lastLoadParams = null;
            this.loadZones(1, this.pageSize());
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    } else {
      // Create new
      const request: CreateZoneRequest = {
        name: this.formData.name.trim(),
        description: this.formData.description?.trim() || undefined
      };
      this.zoneService.createZone(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Zone created successfully.');
            this.closeModal();
            this.lastLoadParams = null;
            this.loadZones(1, this.pageSize());
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    }
  }

  deleteZone(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this zone?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingService.setLoading(true);
        this.errorService.clearError();

        this.zoneService.deleteZone(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.errorService.setSuccess('Zone deleted successfully.');
              this.lastLoadParams = null;
              this.loadZones(1, this.pageSize());
            },
            error: (err) => {
              this.logger.errorWithPrefix('ZoneListComponent', 'Error', err);
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
    const nameSearch = this.filterName.trim() || undefined;
    if (!this.lastLoadParams ||
        this.lastLoadParams.pageNumber !== pageNumber ||
        this.lastLoadParams.pageSize !== pageSize ||
        this.lastLoadParams.sortField !== sf ||
        this.lastLoadParams.sortOrder !== so ||
        this.lastLoadParams.nameSearch !== nameSearch) {
      this.loadZones(pageNumber, pageSize);
    }
  }

  trackByZoneId(index: number, zone: Zone): number {
    return zone.id;
  }
}
