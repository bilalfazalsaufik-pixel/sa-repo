import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { RegTypeService } from '../../services/regtype.service';
import { RegType, CreateRegTypeRequest, UpdateRegTypeRequest } from '../../../../shared/models/regtype.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-regtype-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TooltipModule,
    ModalComponent,
    ErrorMessageComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './regtype-list.component.html',
  styleUrls: ['./regtype-list.component.css']
})
export class RegTypeListComponent implements OnInit {
  regTypes = signal<RegType[]>([]);
  totalRecords = signal(0);
  pageSize = signal(10);
  showModal = signal(false);
  editingRegType = signal<RegType | null>(null);
  formData: { name: string; count: number; dataType: string } = { name: '', count: 1, dataType: 'float' };
  private isLoading = false;
  private lastLoadParams: { pageNumber: number; pageSize: number } | null = null;

  private regTypeService = inject(RegTypeService);
  private permissionService = inject(PermissionService);
  private confirmationService = inject(ConfirmationService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  // Permission checks - RegType management requires "System Settings"
  canManageRegTypes = computed(() => this.permissionService.hasPermission('Manage System Settings'));

  // Data type options
  dataTypes = ['float', 'int', 'bool'];

  ngOnInit(): void {
    // Initial load is handled by p-table lazy loading
  }

  loadRegTypes(pageNumber: number, pageSize: number): void {
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

    this.regTypeService.getRegTypes(pageNumber, pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.regTypes.set(result.items);
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
    this.editingRegType.set(null);
    this.formData = { name: '', count: 1, dataType: 'float' };
    this.showModal.set(true);
  }

  editRegType(regType: RegType): void {
    this.editingRegType.set(regType);
    this.formData = { 
      name: regType.name, 
      count: regType.count, 
      dataType: regType.dataType 
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingRegType.set(null);
    this.formData = { name: '', count: 1, dataType: 'float' };
  }

  saveRegType(): void {
    if (!this.formData.name.trim()) {
      this.errorService.setError('Name is required');
      return;
    }

    if (this.formData.count <= 0) {
      this.errorService.setError('Count must be greater than 0');
      return;
    }

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    if (this.editingRegType()) {
      const request: UpdateRegTypeRequest = {
        id: this.editingRegType()!.id,
        name: this.formData.name,
        count: this.formData.count,
        dataType: this.formData.dataType
      };
      this.regTypeService.updateRegType(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('RegType updated successfully.');
            this.lastLoadParams = null;
            this.loadRegTypes(1, this.pageSize());
            this.closeModal();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    } else {
      const request: CreateRegTypeRequest = {
        name: this.formData.name,
        count: this.formData.count,
        dataType: this.formData.dataType
      };
      this.regTypeService.createRegType(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('RegType created successfully.');
            this.lastLoadParams = null;
            this.loadRegTypes(1, this.pageSize());
            this.closeModal();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    }
  }

  deleteRegType(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this RegType? This action cannot be undone if it is being used by sensors.',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingService.setLoading(true);
        this.errorService.clearError();
        this.regTypeService.deleteRegType(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.errorService.setSuccess('RegType deleted successfully.');
              this.lastLoadParams = null;
              this.loadRegTypes(1, this.pageSize());
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
    
    // Only load if parameters actually changed
    if (!this.lastLoadParams || 
        this.lastLoadParams.pageNumber !== pageNumber || 
        this.lastLoadParams.pageSize !== pageSize) {
      this.loadRegTypes(pageNumber, pageSize);
    }
  }

  trackByRegTypeId(index: number, regType: RegType): number {
    return regType.id;
  }
}
