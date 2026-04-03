import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { SensorService } from '../../services/sensor.service';
import { DeviceService } from '../../../devices/services/device.service';
import { RegTypeService } from '../../../regtypes/services/regtype.service';
import { Sensor, CreateSensorRequest, UpdateSensorRequest } from '../../../../shared/models/sensor.model';
import { Device } from '../../../../shared/models/device.model';
import { RegType } from '../../../../shared/models/regtype.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-sensor-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    TooltipModule,
    ModalComponent, 
    ErrorMessageComponent, 
    LoadingSpinnerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sensor-list.component.html',
  styleUrls: ['./sensor-list.component.css']
})
export class SensorListComponent implements OnInit {
  sensors = signal<Sensor[]>([]);
  devices = signal<Device[]>([]);
  regTypes = signal<RegType[]>([]);
  totalRecords = signal(0);
  pageSize = signal(10);
  showModal = signal(false);
  editingSensor = signal<Sensor | null>(null);
  sortField = signal<string | null>(null);
  sortOrder = signal<number>(1);
  tableFirst = signal(0);
  filterName = '';
  deviceFilterValue: number | null = null;
  formData: { name: string; address?: string; threshold?: number; clearThreshold?: number; deviceId: number | null; regTypeId: number | null } =
    { name: '', deviceId: null, regTypeId: null };
  private isLoading = false;
  private lastLoadParams: { pageNumber: number; pageSize: number; sortField?: string | null; sortOrder?: number; nameSearch?: string; deviceId?: number | null } | null = null;
  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  private sensorService = inject(SensorService);
  private deviceService = inject(DeviceService);
  private regTypeService = inject(RegTypeService);
  private permissionService = inject(PermissionService);
  private confirmationService = inject(ConfirmationService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  // Permission checks
  canManageSensors = computed(() => this.permissionService.hasPermission('Manage Sensors'));

  // Computed dropdown options
  deviceOptions = computed(() =>
    this.devices().map(d => ({ label: `${d.name} (${d.siteName})`, value: d.id }))
  );
  deviceFilterOptions = computed(() =>
    [{ label: 'All devices', value: null as number | null }, ...this.devices().map(d => ({ label: `${d.name} (${d.siteName})`, value: d.id }))]
  );

  regTypeOptions = computed(() =>
    this.regTypes().map(r => ({ label: `${r.name} (${r.dataType}, Count: ${r.count})`, value: r.id }))
  );

  ngOnInit(): void {
    this.loadDevices();
  }

  onFilterChange(): void {
    if (this.filterDebounceTimer) clearTimeout(this.filterDebounceTimer);
    this.filterDebounceTimer = setTimeout(() => {
      this.tableFirst.set(0);
      this.lastLoadParams = null;
      this.loadSensors(1, this.pageSize());
    }, 300);
  }

  loadDevices(): void {
    if (this.devices().length === 0) {
      this.deviceService.getDevices({ pageNumber: 1, pageSize: 1000 })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(result => this.devices.set(result.items));
    }
  }

  loadRegTypes(): void {
    // Only load regTypes if not already loaded (lazy loading for modal)
    if (this.regTypes().length === 0) {
      this.regTypeService.getRegTypes(1, 1000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(result => this.regTypes.set(result.items));
    }
  }

  loadSensors(pageNumber: number, pageSize: number): void {
    if (this.isLoading) return;
    const sf = this.sortField();
    const so = this.sortOrder();
    const nameSearch = this.filterName.trim() || undefined;
    const deviceId = this.deviceFilterValue ?? undefined;
    if (this.lastLoadParams &&
        this.lastLoadParams.pageNumber === pageNumber &&
        this.lastLoadParams.pageSize === pageSize &&
        this.lastLoadParams.sortField === sf &&
        this.lastLoadParams.sortOrder === so &&
        this.lastLoadParams.nameSearch === nameSearch &&
        this.lastLoadParams.deviceId === (deviceId ?? null)) {
      return;
    }

    this.lastLoadParams = { pageNumber, pageSize, sortField: sf, sortOrder: so, nameSearch, deviceId: deviceId ?? null };
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.errorService.clearError();

    this.sensorService.getSensors({ deviceId, sortField: sf ?? undefined, sortOrder: so, nameSearch, pageNumber, pageSize })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.sensors.set(result.items);
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
    this.editingSensor.set(null);
    this.formData = { name: '', deviceId: null, regTypeId: null };
    this.loadRegTypes(); // Lazy-load reg types on first modal open
    this.showModal.set(true);
  }

  editSensor(sensor: Sensor): void {
    this.editingSensor.set(sensor);
    this.formData = {
      name: sensor.name,
      address: sensor.address || '',
      threshold: sensor.threshold || undefined,
      clearThreshold: sensor.clearThreshold || undefined,
      deviceId: sensor.deviceId,
      regTypeId: sensor.regTypeId
    };
    this.loadRegTypes(); // Lazy-load reg types on first modal open
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingSensor.set(null);
    this.formData = { name: '', deviceId: null, regTypeId: null };
  }

  saveSensor(): void {
    if (!this.formData.name.trim() || !this.formData.deviceId || !this.formData.regTypeId) {
      this.errorService.setError('Name, Device, and RegType are required');
      return;
    }
    if (this.formData.threshold !== undefined && this.formData.threshold < 0) {
      this.errorService.setError('Threshold must be a non-negative number');
      return;
    }
    if (this.formData.clearThreshold !== undefined && this.formData.clearThreshold < 0) {
      this.errorService.setError('Clear threshold must be a non-negative number');
      return;
    }

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    if (this.editingSensor()) {
      const request: UpdateSensorRequest = {
        id: this.editingSensor()!.id,
        name: this.formData.name,
        address: this.formData.address,
        threshold: this.formData.threshold,
        clearThreshold: this.formData.clearThreshold,
        deviceId: this.formData.deviceId!,
        regTypeId: this.formData.regTypeId!
      };
      this.sensorService.updateSensor(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Sensor updated successfully.');
            this.lastLoadParams = null;
            this.loadSensors(1, this.pageSize());
            this.closeModal();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    } else {
      const request: CreateSensorRequest = {
        name: this.formData.name,
        address: this.formData.address,
        threshold: this.formData.threshold,
        clearThreshold: this.formData.clearThreshold,
        deviceId: this.formData.deviceId!,
        regTypeId: this.formData.regTypeId!
      };
      this.sensorService.createSensor(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Sensor created successfully.');
            this.lastLoadParams = null;
            this.loadSensors(1, this.pageSize());
            this.closeModal();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    }
  }

  deleteSensor(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this sensor?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingService.setLoading(true);
        this.errorService.clearError();
        this.sensorService.deleteSensor(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.errorService.setSuccess('Sensor deleted successfully.');
              this.lastLoadParams = null;
              this.loadSensors(1, this.pageSize());
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
    const nameSearch = this.filterName.trim() || undefined;
    const deviceId = this.deviceFilterValue ?? undefined;
    if (!this.lastLoadParams ||
        this.lastLoadParams.pageNumber !== pageNumber ||
        this.lastLoadParams.pageSize !== pageSize ||
        this.lastLoadParams.sortField !== sf ||
        this.lastLoadParams.sortOrder !== so ||
        this.lastLoadParams.nameSearch !== nameSearch ||
        this.lastLoadParams.deviceId !== (deviceId ?? null)) {
      this.loadSensors(pageNumber, pageSize);
    }
  }

  trackBySensorId(index: number, sensor: Sensor): number {
    return sensor.id;
  }
}
