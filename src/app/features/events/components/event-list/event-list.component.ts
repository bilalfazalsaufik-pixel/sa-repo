import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { EventService } from '../../services/event.service';
import { EventTypeService } from '../../../eventtypes/services/eventtype.service';
import { SensorService } from '../../../sensors/services/sensor.service';
import { Event, ResolveEventRequest, GetEventsQueryParams } from '../../../../shared/models/event.model';
import { EventType } from '../../../../shared/models/eventtype.model';
import { Sensor } from '../../../../shared/models/sensor.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CardModule,
    TableModule,
    ButtonModule,
    DropdownModule,
    CalendarModule,
    TagModule,
    BadgeModule,
    TooltipModule,
    TextareaModule,
    ModalComponent,
    ErrorMessageComponent, 
    LoadingSpinnerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css']
})
export class EventListComponent implements OnInit, OnDestroy {
  events = signal<Event[]>([]);
  unresolvedCount = signal<number>(0);
  totalRecords = signal(0);
  pageSize = signal(10);
  showResolveModal = signal(false);
  resolvingEvent = signal<Event | null>(null);
  resolutionNotes = signal<string>('');
  
  // Filter options
  filterResolved: 'all' | 'resolved' | 'unresolved' = 'all';
  selectedSensorId = signal<number | undefined>(undefined);
  selectedEventTypeId = signal<number | undefined>(undefined);
  startDate = signal<Date | null>(null);
  endDate = signal<Date | null>(null);

  // Dropdown options
  sensors = signal<Sensor[]>([]);
  eventTypes = signal<EventType[]>([]);

  // Computed dropdown options
  sensorOptions = computed(() => this.sensors().map(s => ({label: s.name, value: s.id})));
  eventTypeOptions = computed(() => this.eventTypes().map(et => ({label: et.name, value: et.id})));
  statusOptions = [
    {label: 'All Events', value: 'all'},
    {label: 'Unresolved Only', value: 'unresolved'},
    {label: 'Resolved Only', value: 'resolved'}
  ];
  
  lastUpdated = signal<Date | null>(null);
  autoRefreshEnabled = signal(true);
  private autoRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly AUTO_REFRESH_MS = 30_000;

  private isLoading = false;
  private lastLoadParams: {
    pageNumber: number; 
    pageSize: number; 
    sensorId?: number; 
    eventTypeId?: number; 
    resolved?: boolean; 
    startDate?: string; 
    endDate?: string 
  } | null = null;

  private eventService = inject(EventService);
  private eventTypeService = inject(EventTypeService);
  private sensorService = inject(SensorService);
  private permissionService = inject(PermissionService);
  private logger = inject(LoggerService);
  private confirmationService = inject(ConfirmationService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  // Permission checks
  canViewEvents = computed(() => this.permissionService.hasPermission('View Events'));
  canResolveEvents = computed(() => this.permissionService.hasPermission('Manage Events'));
  canManageEvents = computed(() => this.permissionService.hasPermission('Manage Events'));

  ngOnInit(): void {
    this.loadEventTypes();
    this.loadSensors();
    this.loadUnresolvedCount();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadEvents(pageNumber: number, pageSize: number): void {
    if (!this.canViewEvents()) {
      this.errorService.setError('You do not have permission to view events.');
      return;
    }

    // Build current params for comparison
    const currentParams = {
      pageNumber,
      pageSize,
      sensorId: this.selectedSensorId(),
      eventTypeId: this.selectedEventTypeId(),
      resolved: this.filterResolved !== 'all' ? (this.filterResolved === 'resolved') : undefined,
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
        this.lastLoadParams.eventTypeId === currentParams.eventTypeId &&
        this.lastLoadParams.resolved === currentParams.resolved &&
        this.lastLoadParams.startDate === currentParams.startDate &&
        this.lastLoadParams.endDate === currentParams.endDate) {
      return;
    }
    
    this.lastLoadParams = currentParams;
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.errorService.clearError();

    const params: GetEventsQueryParams = {};

    if (this.selectedSensorId() !== undefined) {
      params.sensorId = this.selectedSensorId();
    }
    if (this.selectedEventTypeId() !== undefined) {
      params.eventTypeId = this.selectedEventTypeId();
    }
    if (this.filterResolved !== 'all') {
      params.resolved = this.filterResolved === 'resolved';
    }
    if (this.startDate()) {
      params.startDate = this.startDate()!.toISOString().split('T')[0];
    }
    if (this.endDate()) {
      params.endDate = this.endDate()!.toISOString().split('T')[0];
    }
    params.pageNumber = pageNumber;
    params.pageSize = pageSize;

    this.eventService.getEvents(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.events.set(result.items);
          this.totalRecords.set(result.totalCount);
          this.lastUpdated.set(new Date());
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

  loadUnresolvedCount(): void {
    this.eventService.getUnresolvedEventsCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count) => {
          this.unresolvedCount.set(count);
        },
        error: (err) => {
          // Silently fail - not critical for UI
        }
      });
  }

  loadEventTypes(): void {
    this.eventTypeService.getEventTypes(1, 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.eventTypes.set(result.items);
        },
        error: (err) => {
          this.logger.warn('Failed to load event types', err);
        }
      });
  }

  loadSensors(): void {
    this.sensorService.getSensors({ pageNumber: 1, pageSize: 1000 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.sensors.set(result.items);
        },
        error: (err) => {
          this.logger.warn('Failed to load sensors', err);
        }
      });
  }

  applyFilters(): void {
    // Clear lastLoadParams when filters change to force reload
    this.lastLoadParams = null;
    this.loadEvents(1, this.pageSize());
  }

  clearFilters(): void {
    this.filterResolved = 'all';
    this.selectedSensorId.set(undefined);
    this.selectedEventTypeId.set(undefined);
    this.startDate.set(null);
    this.endDate.set(null);
    // Clear lastLoadParams when filters are cleared
    this.lastLoadParams = null;
    this.loadEvents(1, this.pageSize());
  }

  showResolveForm(event: Event): void {
    if (event.resolved) {
      this.errorService.setError('This event is already resolved.');
      return;
    }
    this.resolvingEvent.set(event);
    this.resolutionNotes.set('');
    this.showResolveModal.set(true);
  }

  closeResolveModal(): void {
    this.showResolveModal.set(false);
    this.resolvingEvent.set(null);
    this.resolutionNotes.set('');
  }

  resolveEvent(): void {
    const event = this.resolvingEvent();
    if (!event) return;

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    const request: ResolveEventRequest = {
      resolutionNotes: this.resolutionNotes().trim() || undefined
    };

    this.eventService.resolveEvent(event.id, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.errorService.setSuccess('Event resolved successfully.');
          this.lastLoadParams = null;
          this.loadEvents(1, this.pageSize());
          this.loadUnresolvedCount();
          this.closeResolveModal();
        },
        error: (err) => {
          this.errorService.setErrorFromHttp(err);
          this.loadingService.setLoading(false);
        }
      });
  }

  deleteEvent(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this event?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingService.setLoading(true);
        this.errorService.clearError();

        this.eventService.deleteEvent(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.errorService.setSuccess('Event deleted successfully.');
              this.lastLoadParams = null;
              this.loadEvents(1, this.pageSize());
              this.loadUnresolvedCount();
            },
            error: (err) => {
              this.errorService.setErrorFromHttp(err);
              this.loadingService.setLoading(false);
            }
          });
      }
    });
  }

  getSeverityBadge(severity: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'danger';
      case 'medium':
        return 'warn';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  }

  displayedColumns = computed(() => {
    const cols = ['timeRaised', 'sensor', 'device', 'site', 'zone', 'eventType', 'severity', 'message', 'status', 'resolvedBy', 'resolvedAt'];
    if (this.canResolveEvents() || this.canManageEvents()) {
      cols.push('actions');
    }
    return cols;
  });

  trackByEventId(index: number, event: Event): number {
    return event.id;
  }

  toggleAutoRefresh(): void {
    if (this.autoRefreshEnabled()) {
      this.stopAutoRefresh();
      this.autoRefreshEnabled.set(false);
    } else {
      this.autoRefreshEnabled.set(true);
      this.startAutoRefresh();
    }
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshInterval = setInterval(() => {
      // Guard both calls behind isLoading so a slow loadEvents cannot overlap
      // with the next interval tick triggering a second concurrent fetch.
      if (this.autoRefreshEnabled() && !this.isLoading) {
        this.lastLoadParams = null;
        this.loadEvents(1, this.pageSize());
        this.loadUnresolvedCount();
      }
    }, this.AUTO_REFRESH_MS);
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshInterval !== null) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
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
    this.loadEvents(pageNumber, pageSize);
  }
}
