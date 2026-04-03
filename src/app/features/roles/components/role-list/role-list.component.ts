import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
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
import { RolesService } from '../../services/roles.service';
import { Role, CreateRoleRequest, UpdateRoleRequest } from '../../../../shared/models/role.model';
import { PermissionService } from '../../../../core/services/permission.service';

import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    TagModule,
    TooltipModule,
    ErrorMessageComponent,
    LoadingSpinnerComponent,
    ModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.css']
})
export class RoleListComponent implements OnInit {
  roles = signal<Role[]>([]);
  totalRecords = signal(0);
  tableFirst = signal(0);
  pageSize = signal(50);
  showModal = signal(false);
  editingRole = signal<Role | null>(null);
  formData: { name: string; description: string; isSystemWide: boolean } = { name: '', description: '', isSystemWide: false };

  private rolesService = inject(RolesService);
  private permissionService = inject(PermissionService);
  private confirmationService = inject(ConfirmationService);
  private destroyRef = inject(DestroyRef);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);

  private isLoading = false;
  private lastLoadParams: { pageNumber: number; pageSize: number } | null = null;

  clearError = (): void => this.errorService.clearError();

  canManageRoles = computed(() => this.permissionService.hasPermission('Manage Roles'));
  canManagePermissions = computed(() => this.permissionService.hasPermission('Manage Roles'));

  ngOnInit(): void {
    // Initial load is handled by p-table lazy loading
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const pageSize = event.rows ?? 10;
    const first = event.first ?? 0;
    const pageNumber = Math.floor(first / pageSize) + 1;
    if (this.pageSize() !== pageSize) this.pageSize.set(pageSize);
    this.loadRoles(pageNumber, pageSize);
  }

  loadRoles(pageNumber: number, pageSize: number): void {
    if (this.isLoading) return;
    if (this.lastLoadParams &&
        this.lastLoadParams.pageNumber === pageNumber &&
        this.lastLoadParams.pageSize === pageSize) {
      return;
    }

    this.lastLoadParams = { pageNumber, pageSize };
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.errorService.clearError();

    this.rolesService
      .getRoles({ pageNumber, pageSize })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.roles.set(result.items);
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
    this.editingRole.set(null);
    this.formData = { name: '', description: '', isSystemWide: false };
    this.showModal.set(true);
  }

  editRole(role: Role): void {
    this.editingRole.set(role);
    this.formData = { name: role.name, description: role.description || '', isSystemWide: role.isSystemWide };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingRole.set(null);
    this.formData = { name: '', description: '', isSystemWide: false };
  }

  saveRole(): void {
    if (!this.formData.name.trim()) {
      this.errorService.setError('Role name is required');
      return;
    }

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    const role = this.editingRole();

    if (role) {
      const request: UpdateRoleRequest = {
        id: role.id,
        name: this.formData.name.trim(),
        description: this.formData.description?.trim() || ''
      };
      this.rolesService.updateRole(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Role updated successfully.');
            this.closeModal();
            this.reloadRoles();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    } else {
      const request: CreateRoleRequest = {
        name: this.formData.name.trim(),
        description: this.formData.description?.trim() || '',
        isSystemWide: this.formData.isSystemWide
      };
      this.rolesService.createRole(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Role created successfully.');
            this.closeModal();
            this.reloadRoles();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    }
  }

  deleteRole(role: Role): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the role "${role.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingService.setLoading(true);
        this.errorService.clearError();

        this.rolesService.deleteRole(role.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.errorService.setSuccess('Role deleted successfully.');
              this.reloadRoles();
            },
            error: (err) => {
              this.errorService.setErrorFromHttp(err);
              this.loadingService.setLoading(false);
            }
          });
      }
    });
  }

  private reloadRoles(): void {
    this.lastLoadParams = null;
    this.loadRoles(1, this.pageSize());
  }

  trackByRoleId(_: number, role: Role): number {
    return role.id;
  }
}
