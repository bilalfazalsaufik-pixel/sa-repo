import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';

import { UsersService } from '../../services/users.service';
import { UserListItem, CreateUserRequest, UpdateUserRequest } from '../../models/user-list-item.model';
import { RolesService } from '../../../roles/services/roles.service';
import { TenantService } from '../../../tenants/services/tenant.service';
import { Role } from '../../../../shared/models/role.model';
import { Tenant } from '../../../../shared/models/tenant.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    MultiSelectModule,
    TagModule,
    TooltipModule,
    ModalComponent,
    ErrorMessageComponent,
    LoadingSpinnerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  users = signal<UserListItem[]>([]);
  totalRecords = signal(0);
  pageSize = signal(10);
  tenantIdFromRoute = signal<number | null>(null);
  showModal = signal(false);
  editingUser = signal<UserListItem | null>(null);
  roles = signal<Role[]>([]);
  tenants = signal<Tenant[]>([]);

  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    roleIds: number[];
    tenantId: number | null;
  } = { firstName: '', lastName: '', email: '', phoneNumber: '', roleIds: [], tenantId: null };

  pageTitle = computed(() => {
    const tid = this.tenantIdFromRoute();
    if (tid != null) return 'Users by tenant';
    return this.permissionService.hasRole('SuperAdministrator') ? 'All Users' : 'Users';
  });

  pageSubtitle = computed(() => {
    const tid = this.tenantIdFromRoute();
    if (tid != null) {
      const tenant = this.tenants().find(t => t.id === tid);
      return tenant ? `Users in ${tenant.name}` : 'Users by tenant';
    }
    return this.permissionService.hasRole('SuperAdministrator')
      ? 'Users across all tenants'
      : 'Users in your tenant';
  });

  canViewUsers = computed(() =>
    this.permissionService.hasPermission('View Users') || this.permissionService.hasRole('SuperAdministrator')
  );

  canManageUsers = computed(() =>
    this.permissionService.hasPermission('Manage Users') || this.permissionService.hasRole('SuperAdministrator')
  );

  isSuperAdmin = computed(() => this.permissionService.hasRole('SuperAdministrator'));

  roleOptions = computed(() =>
    this.roles().map(r => ({ label: r.name, value: r.id }))
  );

  tenantOptions = computed(() =>
    this.tenants().map(t => ({ label: t.name, value: t.id }))
  );

  private usersService = inject(UsersService);
  private rolesService = inject(RolesService);
  private tenantService = inject(TenantService);
  private route = inject(ActivatedRoute);
  private permissionService = inject(PermissionService);
  private confirmationService = inject(ConfirmationService);
  private logger = inject(LoggerService);
  private destroyRef = inject(DestroyRef);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);

  private isLoading = false;
  private lastLoadParams: { pageNumber: number; pageSize: number; tenantId: number | undefined } | null = null;

  ngOnInit(): void {
    if (this.isSuperAdmin()) this.loadTenants();
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const tid = params['tenantId'];
        this.tenantIdFromRoute.set(tid != null && tid !== '' ? +tid : null);
        this.lastLoadParams = null;
        this.loadUsers(1, this.pageSize());
      });
  }

  loadUsers(pageNumber: number, size: number): void {
    if (!this.canViewUsers()) {
      this.errorService.setError('You do not have permission to view users.');
      return;
    }
    if (this.isLoading) return;
    const tid = this.tenantIdFromRoute();
    const tenantId = tid != null ? tid : undefined;
    if (
      this.lastLoadParams &&
      this.lastLoadParams.pageNumber === pageNumber &&
      this.lastLoadParams.pageSize === size &&
      this.lastLoadParams.tenantId === tenantId
    ) {
      return;
    }

    this.lastLoadParams = { pageNumber, pageSize: size, tenantId };
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.errorService.clearError();

    this.usersService.getUsers({ pageNumber, pageSize: size, tenantId }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.users.set(result.items);
        this.totalRecords.set(result.totalCount);
        this.loadingService.setLoading(false);
        this.isLoading = false;
      },
      error: err => {
        this.logger.errorWithPrefix('UserListComponent', 'Error loading users', err);
        this.errorService.setErrorFromHttp(err);
        this.loadingService.setLoading(false);
        this.isLoading = false;
        this.lastLoadParams = null;
      }
    });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const pageNumber = event.first != null && event.rows != null ? Math.floor(event.first / event.rows) + 1 : 1;
    const size = event.rows ?? this.pageSize();
    this.pageSize.set(size);
    this.loadUsers(pageNumber, size);
  }

  trackByUserId(_index: number, user: UserListItem): number {
    return user.userId;
  }

  displayName(user: UserListItem): string {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return name || user.email;
  }

  rolesDisplay(user: UserListItem): string {
    return user.roles?.map(r => r.roleName).join(', ') || '-';
  }

  getTenantLabel(tenantId: number | null | undefined): string {
    return this.tenantOptions().find(t => t.value === tenantId)?.label ?? '—';
  }

  isRowUserSuperAdmin(user: UserListItem): boolean {
    return user.roles?.some(r => r.roleName === 'SuperAdministrator') ?? false;
  }

  isCurrentUser(user: UserListItem): boolean {
    return user.userId === this.permissionService.currentUserId();
  }

  canActOnUser(user: UserListItem): boolean {
    return !this.isRowUserSuperAdmin(user) || this.isSuperAdmin();
  }

  // --- CRUD Methods ---

  showCreateForm(): void {
    this.editingUser.set(null);
    this.formData = { firstName: '', lastName: '', email: '', phoneNumber: '', roleIds: [], tenantId: null };
    this.loadRoles();
    this.showModal.set(true);
  }

  editUser(user: UserListItem): void {
    this.editingUser.set(user);
    this.formData = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      roleIds: user.roles?.map(r => r.roleId) || [],
      tenantId: null
    };
    this.loadRoles();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingUser.set(null);
    this.formData = { firstName: '', lastName: '', email: '', phoneNumber: '', roleIds: [], tenantId: null };
  }

  saveUser(): void {
    if (!this.formData.firstName.trim() || !this.formData.lastName.trim() || !this.formData.email.trim()) {
      this.errorService.setError('First name, last name, and email are required.');
      return;
    }
    if (this.formData.roleIds.length === 0) {
      this.errorService.setError('At least one role must be assigned.');
      return;
    }
    if (this.isSuperAdmin() && !this.editingUser() && !this.formData.tenantId) {
      this.errorService.setError('Tenant is required.');
      return;
    }

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    if (this.editingUser()) {
      const request: UpdateUserRequest = {
        id: this.editingUser()!.userId,
        firstName: this.formData.firstName,
        lastName: this.formData.lastName,
        email: this.formData.email,
        phoneNumber: this.formData.phoneNumber || undefined,
        roleIds: this.formData.roleIds
      };
      this.usersService.updateUser(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('User updated successfully.');
            this.lastLoadParams = null;
            this.loadUsers(1, this.pageSize());
            this.closeModal();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    } else {
      const request: CreateUserRequest = {
        firstName: this.formData.firstName,
        lastName: this.formData.lastName,
        email: this.formData.email,
        phoneNumber: this.formData.phoneNumber || undefined,
        roleIds: this.formData.roleIds,
        tenantId: this.formData.tenantId || undefined
      };
      this.usersService.createUser(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('User created successfully.');
            this.lastLoadParams = null;
            this.loadUsers(1, this.pageSize());
            this.closeModal();
          },
          error: (err) => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    }
  }

  deleteUser(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this user?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingService.setLoading(true);
        this.errorService.clearError();
        this.usersService.deleteUser(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.errorService.setSuccess('User deleted successfully.');
              this.lastLoadParams = null;
              this.loadUsers(1, this.pageSize());
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

  // --- Helper loaders ---

  private loadRoles(): void {
    if (this.roles().length === 0) {
      this.rolesService.getRoles({ pageNumber: 1, pageSize: 100 })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(result => this.roles.set(result.items));
    }
  }

  private loadTenants(): void {
    if (this.tenants().length === 0) {
      this.tenantService.getTenants(1, 100)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(result => this.tenants.set(result.items));
    }
  }
}
