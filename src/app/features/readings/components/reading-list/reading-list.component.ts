import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CalendarModule } from 'primeng/calendar';
import { ReadingService } from '../../services/reading.service';
import { SensorService } from '../../../sensors/services/sensor.service';
import { Reading, GetReadingsQueryParams } from '../../../../shared/models/reading.model';
import { Sensor } from '../../../../shared/models/sensor.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { ReadingChartComponent } from '../reading-chart/reading-chart.component';

@Component({
  selector: 'app-reading-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    SelectModule,
    CalendarModule,
    ErrorMessageComponent,
    ReadingChartComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reading-list.component.html',
  styleUrls: ['./reading-list.component.css']
})
export class ReadingListComponent implements OnInit {
  readings = signal<Reading[]>([]);
  latestReading = signal<Reading | null>(null);
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
  
  private isLoading = false;
  private lastLoadParams: { pageNumber: number; pageSize: number; sensorId?: number; startDate?: string; endDate?: string } | null = null;

  private readingService = inject(ReadingService);
  private sensorService = inject(SensorService);
  private permissionService = inject(PermissionService);
  private logger = inject(LoggerService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  // Permission checks
  canViewReadings = computed(() => this.permissionService.hasPermission('View Readings'));

  ngOnInit(): void {
    this.loadSensors();
  }

  loadSensors(): void {
    this.sensorService.getSensors({ pageNumber: 1, pageSize: 1000 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.sensors.set(result.items),
        error: (error) => this.errorService.setError('Failed to load sensors: ' + (error.message || 'Unknown error'))
      });
  }

  loadReadings(pageNumber: number, pageSize: number): void {
    if (!this.canViewReadings()) {
      this.errorService.setError('You do not have permission to view readings.');
      return;
    }

    const sensorId = this.selectedSensorId();
    if (!sensorId) {
      this.readings.set([]);
      this.latestReading.set(null);
      this.totalRecords.set(0);
      return;
    }

    // Build current params for comparison
    const currentParams = {
      pageNumber,
      pageSize,
      sensorId,
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

    const params: GetReadingsQueryParams = {
      sensorId: sensorId,
      pageNumber,
      pageSize
    };

    if (this.startDate()) {
      params.startDate = this.startDate()!.toISOString().split('T')[0];
    }
    if (this.endDate()) {
      params.endDate = this.endDate()!.toISOString().split('T')[0];
    }

    this.readingService.getReadings(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (readings) => {
          this.readings.set(readings.items);
          this.totalRecords.set(readings.totalCount);
          this.loadingService.setLoading(false);
          this.isLoading = false;
          if (readings.items.length > 0) {
            this.loadLatestReading(sensorId);
          } else {
            this.latestReading.set(null);
          }
        },
        error: (error) => {
          this.errorService.setError('Failed to load readings: ' + (error.message || 'Unknown error'));
          this.loadingService.setLoading(false);
          this.isLoading = false;
          // Clear lastLoadParams on error so retry can work
          this.lastLoadParams = null;
        }
      });
  }

  loadLatestReading(sensorId: number): void {
    this.readingService.getLatestReading(sensorId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reading) => this.latestReading.set(reading),
        error: (error) => {
          this.logger.warn('Failed to load latest reading', error);
        }
      });
  }

  applyFilters(): void {
    // Clear lastLoadParams when filters change to force reload
    this.lastLoadParams = null;
    this.loadReadings(1, this.pageSize());
  }

  clearFilters(): void {
    this.selectedSensorId.set(undefined);
    this.startDate.set(null);
    this.endDate.set(null);
    this.readings.set([]);
    this.latestReading.set(null);
    this.totalRecords.set(0);
    // Clear lastLoadParams when filters are cleared
    this.lastLoadParams = null;
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
    this.loadReadings(pageNumber, pageSize);
  }

  trackByReadingId(index: number, reading: Reading): number {
    return reading.id;
  }

  formatValue(value: string, valueType?: string): string {
    if (!valueType) return value;
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return numValue.toFixed(2);
    }
    
    return value;
  }
}
