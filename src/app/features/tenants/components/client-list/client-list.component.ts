import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';

import { TenantService } from '../../services/tenant.service';
import { Tenant, CreateTenantRequest, UpdateTenantRequest } from '../../../../shared/models/tenant.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { LoggerService } from '../../../../core/services/logger.service';

import { PermissionService } from '../../../../core/services/permission.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    TagModule,
    TooltipModule,
    ModalComponent, 
    ErrorMessageComponent, 
    LoadingSpinnerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-list.component.html',
  styleUrls: ['./client-list.component.css']
})
export class TenantListComponent implements OnInit {
  tenants = signal<Tenant[]>([]);
  totalRecords = signal(0);
  pageSize = signal(10);
  showModal = signal(false);
  editingTenant = signal<Tenant | null>(null);
  formData: { name: string; description?: string; isActive: boolean } = { name: '', description: '', isActive: true };
  private isLoading = false;
  private lastLoadParams: { pageNumber: number; pageSize: number } | null = null;

  private tenantService = inject(TenantService);
  private permissionService = inject(PermissionService);
  private logger = inject(LoggerService);
  private confirmationService = inject(ConfirmationService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  // Permission checks
  canViewTenants = computed(() => this.permissionService.hasPermission('View Tenants'));
  canManageTenants = computed(() => this.permissionService.hasPermission('Manage Tenants'));

  // Table columns
  displayedColumns = computed(() => {
    const cols = ['name', 'description', 'status', 'createdDate'];
    if (this.canManageTenants()) {
      cols.push('actions');
    }
    return cols;
  });

  ngOnInit(): void {
    // Initial load is handled by p-table lazy loading
  }

  loadTenants(pageNumber: number, pageSize: number): void {
    if (!this.canViewTenants()) {
      this.errorService.setError('You do not have permission to view tenants.');
      return;
    }

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

    this.tenantService.getTenants(pageNumber, pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.tenants.set(result.items);
          this.totalRecords.set(result.totalCount);
          this.loadingService.setLoading(false);
          this.isLoading = false;
        },
        error: (err) => {
          this.logger.errorWithPrefix('TenantListComponent', 'Error loading tenants', err);
          this.errorService.setErrorFromHttp(err);
          this.loadingService.setLoading(false);
          this.isLoading = false;
          // Clear lastLoadParams on error so retry can work
          this.lastLoadParams = null;
        }
      });
  }

  showCreateForm(): void {
    this.editingTenant.set(null);
    this.formData = { name: '', description: '', isActive: true };
    this.showModal.set(true);
  }

  editTenant(tenant: Tenant): void {
    this.editingTenant.set(tenant);
    this.formData = { name: tenant.name, description: tenant.description || '', isActive: tenant.isActive };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingTenant.set(null);
    this.formData = { name: '', description: '', isActive: true };
  }

  saveTenant(): void {
    if (!this.formData.name.trim()) {
      this.errorService.setError('Tenant name is required');
      return;
    }

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    const tenant = this.editingTenant();
    
    if (tenant) {
      // Update existing
      const request: UpdateTenantRequest = {
        id: tenant.id,
        name: this.formData.name.trim(),
        description: this.formData.description?.trim() || undefined,
        isActive: this.formData.isActive
      };
      this.tenantService.updateTenant(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Tenant updated successfully.');
            this.closeModal();
            // Clear lastLoadParams to force reload
            this.lastLoadParams = null;
            this.loadTenants(1, this.pageSize());
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    } else {
      // Create new
      const request: CreateTenantRequest = {
        name: this.formData.name.trim(),
        description: this.formData.description?.trim() || undefined,
        isActive: this.formData.isActive
      };
      this.tenantService.createTenant(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Tenant created successfully.');
            this.closeModal();
            // Clear lastLoadParams to force reload
            this.lastLoadParams = null;
            this.loadTenants(1, this.pageSize());
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    }
  }

  deleteTenant(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this tenant?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingService.setLoading(true);
        this.errorService.clearError();

        this.tenantService.deleteTenant(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.errorService.setSuccess('Tenant deleted successfully.');
              // Clear lastLoadParams to force reload
              this.lastLoadParams = null;
              this.loadTenants(1, this.pageSize());
            },
            error: (err) => {
              this.logger.errorWithPrefix('TenantListComponent', 'Error deleting tenant', err);
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
    
    // Only load if parameters actually changed
    if (!this.lastLoadParams || 
        this.lastLoadParams.pageNumber !== pageNumber || 
        this.lastLoadParams.pageSize !== pageSize) {
      this.loadTenants(pageNumber, pageSize);
    }
  }

  trackByTenantId(index: number, tenant: Tenant): number {
    return tenant.id;
  }
}
