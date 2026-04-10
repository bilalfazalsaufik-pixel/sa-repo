import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { EventTypeService } from '../../services/eventtype.service';
import { EventType, CreateEventTypeRequest, UpdateEventTypeRequest } from '../../../../shared/models/eventtype.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-eventtype-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TooltipModule,
    ModalComponent,
    ErrorMessageComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './eventtype-list.component.html',
  styleUrls: ['./eventtype-list.component.css']
})
export class EventTypeListComponent implements OnInit {
  eventTypes = signal<EventType[]>([]);
  totalRecords = signal(0);
  pageSize = signal(10);
  showModal = signal(false);
  editingEventType = signal<EventType | null>(null);
  formData: { name: string; description?: string; category?: string; severity: string } = 
    { name: '', severity: 'Medium' };
  private isLoading = false;
  private lastLoadParams: { pageNumber: number; pageSize: number } | null = null;

  private eventTypeService = inject(EventTypeService);
  private permissionService = inject(PermissionService);
  private confirmationService = inject(ConfirmationService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  // Permission checks - EventType management requires "System Settings"
  canManageEventTypes = computed(() => this.permissionService.hasPermission('Manage System Settings'));

  // Severity options
  severities = ['Low', 'Medium', 'High', 'Critical'];

  ngOnInit(): void {
    // Initial load is handled by p-table lazy loading
  }

  loadEventTypes(pageNumber: number, pageSize: number): void {
    // Prevent duplicate concurrent requests
    if (this.isLoading) {
      return;
    }
    
    // Prevent loading the same page again (avoid infinite loops)
    if (this.lastLoadParams && 
        this.lastLoadParams.pageNumber === pageNumber && 
        this.lastLoadParams.pageSize === pageSize) {
      return;
    }
    
    this.lastLoadParams = { pageNumber, pageSize };
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.errorService.clearError();
    
    this.eventTypeService.getEventTypes(pageNumber, pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.eventTypes.set(result.items);
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

  showCreateForm(): void {
    this.editingEventType.set(null);
    this.formData = { name: '', severity: 'Medium' };
    this.showModal.set(true);
  }

  editEventType(eventType: EventType): void {
    this.editingEventType.set(eventType);
    this.formData = {
      name: eventType.name,
      description: eventType.description || '',
      category: eventType.category || '',
      severity: eventType.severity
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingEventType.set(null);
    this.formData = { name: '', severity: 'Medium' };
  }

  saveEventType(): void {
    if (!this.formData.name.trim()) {
      this.errorService.setError('Name is required');
      return;
    }

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    if (this.editingEventType()) {
      const request: UpdateEventTypeRequest = {
        id: this.editingEventType()!.id,
        name: this.formData.name,
        description: this.formData.description || undefined,
        category: this.formData.category || undefined,
        severity: this.formData.severity
      };
      this.eventTypeService.updateEventType(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Event type updated successfully.');
            this.lastLoadParams = null;
            this.loadEventTypes(1, this.pageSize());
            this.closeModal();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    } else {
      const request: CreateEventTypeRequest = {
        name: this.formData.name,
        description: this.formData.description || undefined,
        category: this.formData.category || undefined,
        severity: this.formData.severity
      };
      this.eventTypeService.createEventType(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Event type created successfully.');
            this.lastLoadParams = null;
            this.loadEventTypes(1, this.pageSize());
            this.closeModal();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    }
  }

  deleteEventType(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this EventType?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingService.setLoading(true);
        this.errorService.clearError();
        this.eventTypeService.deleteEventType(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.errorService.setSuccess('Event type deleted successfully.');
              this.lastLoadParams = null;
              this.loadEventTypes(1, this.pageSize());
            },
            error: (err) => {
              this.errorService.setErrorFromHttp(err);
              this.loadingService.setLoading(false);
            }
          });
      }
    });
  }

  getSeveritySeverity(severity: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'danger';
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
    const cols = ['name', 'description', 'category', 'severity'];
    if (this.canManageEventTypes()) {
      cols.push('actions');
    }
    return cols;
  });

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
    
    // Only load if parameters actually changed
    if (!this.lastLoadParams || 
        this.lastLoadParams.pageNumber !== pageNumber || 
        this.lastLoadParams.pageSize !== pageSize) {
      this.loadEventTypes(pageNumber, pageSize);
    }
  }

  trackByEventTypeId(index: number, eventType: EventType): number {
    return eventType.id;
  }
}
