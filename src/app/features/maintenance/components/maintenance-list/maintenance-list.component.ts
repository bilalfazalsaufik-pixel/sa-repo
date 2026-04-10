import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CalendarModule } from 'primeng/calendar';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { MaintenanceService } from '../../services/maintenance.service';
import { SensorService } from '../../../sensors/services/sensor.service';
import { Maintenance, GetMaintenancesQueryParams } from '../../../../shared/models/maintenance.model';
import { Sensor } from '../../../../shared/models/sensor.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-maintenance-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    SelectModule,
    CalendarModule,
    TextareaModule,
    TooltipModule,
    ModalComponent,
    ErrorMessageComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './maintenance-list.component.html',
  styleUrls: ['./maintenance-list.component.css']
})
export class MaintenanceListComponent implements OnInit {
  maintenances = signal<Maintenance[]>([]);
  totalRecords = signal(0);
  pageSize = signal(10);

  // Filter options
  selectedSensorId = signal<number | undefined>(undefined);
  startDate = signal<Date | null>(null);
  endDate = signal<Date | null>(null);

  // Dropdown options
  sensors = signal<Sensor[]>([]);

  // Computed dropdown options
  sensorOptions = computed(() => this.sensors().map(s => ({label: s.name + ' (' + s.deviceName + ')', value: s.id})));

  // Edit modal state
  showModal = signal(false);
  editingMaintenance = signal<Maintenance | null>(null);
  editMessage = '';

  private isLoading = false;
  private lastLoadParams: { pageNumber: number; pageSize: number; sensorId?: number; startDate?: string; endDate?: string } | null = null;

  private maintenanceService = inject(MaintenanceService);
  private sensorService = inject(SensorService);
  private permissionService = inject(PermissionService);
  private confirmationService = inject(ConfirmationService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  // Permission checks
  canViewMaintenance = computed(() => this.permissionService.hasPermission('View Maintenance'));
  canManageMaintenance = computed(() => this.permissionService.hasPermission('Manage Maintenance'));

  ngOnInit(): void {
    this.loadSensors();
    // Initial load is handled by p-table lazy loading
  }

  loadSensors(): void {
    this.sensorService.getSensors({ pageNumber: 1, pageSize: 1000 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.sensors.set(result.items),
        error: (err) => this.errorService.setErrorFromHttp(err)
      });
  }

  loadMaintenances(pageNumber: number, pageSize: number): void {
    if (!this.canViewMaintenance()) {
      this.errorService.setError('You do not have permission to view maintenance.');
      return;
    }

    // Build current params for comparison
    const currentParams = {
      pageNumber,
      pageSize,
      sensorId: this.selectedSensorId(),
      startDate: this.startDate() ? this.startDate()!.toISOString().split('T')[0] : undefined,
      endDate: this.endDate() ? this.endDate()!.toISOString().split('T')[0] : undefined
    };

    // Prevent duplicate concurrent requests
    if (this.isLoading) {
      return;
    }

    // Prevent loading the same page with same filters again (avoid infinite loops)
    if (this.lastLoadParams &&
        this.lastLoadParams.pageNumber === currentParams.pageNumber &&
        this.lastLoadParams.pageSize === currentParams.pageSize &&
        this.lastLoadParams.sensorId === currentParams.sensorId &&
        this.lastLoadParams.startDate === currentParams.startDate &&
        this.lastLoadParams.endDate === currentParams.endDate) {
      return;
    }

    this.lastLoadParams = currentParams;
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.errorService.clearError();

    const params: GetMaintenancesQueryParams = {};
    if (this.selectedSensorId()) {
      params.sensorId = this.selectedSensorId();
    }
    if (this.startDate()) {
      params.startDate = this.startDate()!.toISOString().split('T')[0];
    }
    if (this.endDate()) {
      params.endDate = this.endDate()!.toISOString().split('T')[0];
    }
    params.pageNumber = pageNumber;
    params.pageSize = pageSize;

    this.maintenanceService.getMaintenances(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.maintenances.set(result.items);
          this.totalRecords.set(result.totalCount);
          this.loadingService.setLoading(false);
          this.isLoading = false;
        },
        error: (err) => {
          this.errorService.setErrorFromHttp(err);
          this.loadingService.setLoading(false);
          this.isLoading = false;
          // Clear lastLoadParams on error so retry can work
          this.lastLoadParams = null;
        }
      });
  }

  applyFilters(): void {
    if (this.startDate() && this.endDate() && this.startDate()! > this.endDate()!) {
      this.errorService.setError('Start date must be on or before end date.');
      return;
    }
    // Clear lastLoadParams when filters change to force reload
    this.lastLoadParams = null;
    this.loadMaintenances(1, this.pageSize());
  }

  clearFilters(): void {
    this.selectedSensorId.set(undefined);
    this.startDate.set(null);
    this.endDate.set(null);
    this.totalRecords.set(0);
    // Clear lastLoadParams when filters are cleared
    this.lastLoadParams = null;
    this.loadMaintenances(1, this.pageSize());
  }

  showEditForm(maintenance: Maintenance): void {
    this.editingMaintenance.set(maintenance);
    this.editMessage = maintenance.message;
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingMaintenance.set(null);
    this.editMessage = '';
  }

  saveMaintenance(): void {
    if (!this.editMessage.trim()) {
      this.errorService.setError('Message is required.');
      return;
    }

    const editing = this.editingMaintenance();
    if (!editing) return;

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    this.maintenanceService.updateMaintenance({ id: editing.id, message: this.editMessage })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.errorService.setSuccess('Maintenance updated successfully.');
          this.lastLoadParams = null;
          this.loadMaintenances(1, this.pageSize());
          this.closeModal();
        },
        error: (err) => {
          this.errorService.setErrorFromHttp(err);
          this.loadingService.setLoading(false);
        }
      });
  }

  deleteMaintenance(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this maintenance record?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingService.setLoading(true);
        this.errorService.clearError();
        this.maintenanceService.deleteMaintenance(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.errorService.setSuccess('Maintenance record deleted successfully.');
              this.lastLoadParams = null;
              this.loadMaintenances(1, this.pageSize());
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
    const pageNumber = Math.floor(first / pageSize) + 1;

    // Only update pageSize if it changed to avoid unnecessary re-renders
    if (this.pageSize() !== pageSize) {
      this.pageSize.set(pageSize);
    }

    // Always load when lazy load is triggered (filters might have changed)
    this.loadMaintenances(pageNumber, pageSize);
  }

  trackByMaintenanceId(index: number, maintenance: Maintenance): number {
    return maintenance.id;
  }
}
