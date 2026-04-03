import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmationService } from 'primeng/api';
import { NotificationService } from '../../services/notification.service';
import {
  NotificationRule,
  NotificationValue,
  CreateNotificationRuleRequest,
  UpdateNotificationRuleRequest
} from '../../../../shared/models/notification.model';
import { ZoneService } from '../../../zones/services/zone.service';
import { Zone } from '../../../../shared/models/zone.model';
import { UsersService } from '../../../users/services/users.service';
import { UserListItem } from '../../../users/models/user-list-item.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    TagModule,
    TooltipModule,
    CheckboxModule,
    ModalComponent,
    ErrorMessageComponent,
    LoadingSpinnerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.css']
})
export class NotificationListComponent implements OnInit {
  rules = signal<NotificationRule[]>([]);
  totalRecords = signal(0);
  pageSize = signal(10);
  showModal = signal(false);
  editingRule = signal<NotificationRule | null>(null);
  formData: {
    userId: number | undefined;
    zoneId: number | undefined;
    timeframe: string;
    notificationValueId: number | undefined;
    active: boolean;
  } = {
    userId: undefined,
    zoneId: undefined,
    timeframe: '',
    notificationValueId: undefined,
    active: true
  };

  timeframeSearch = signal('');
  activeFilter = signal<boolean | undefined>(undefined);
  private isLoading = false;
  private lastLoadParams: {
    pageNumber: number;
    pageSize: number;
    timeframeSearch?: string;
    active?: boolean;
  } | null = null;

  notificationValues = signal<NotificationValue[]>([]);
  zones = signal<Zone[]>([]);
  users = signal<UserListItem[]>([]);

  notificationValueOptions = computed(() =>
    this.notificationValues().map(nv => ({ label: nv.name, value: nv.id }))
  );
  zoneOptions = computed(() =>
    this.zones().map(z => ({ label: z.name, value: z.id }))
  );
  userOptions = computed(() =>
    this.users().map(u => ({
      label: `${u.firstName} ${u.lastName}`.trim() || u.email,
      value: u.userId
    }))
  );

  filterActiveOptions = [
    { label: 'All', value: undefined },
    { label: 'Active', value: true },
    { label: 'Inactive', value: false }
  ];

  private notificationService = inject(NotificationService);
  private zoneService = inject(ZoneService);
  private usersService = inject(UsersService);
  private permissionService = inject(PermissionService);
  private confirmationService = inject(ConfirmationService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  canViewNotifications = computed(() => this.permissionService.hasPermission('View Notifications'));
  canManageNotifications = computed(() => this.permissionService.hasPermission('Manage Notifications'));

  ngOnInit(): void {
    this.loadNotificationValues();
    this.loadZones();
    this.loadUsers();
  }

  loadNotificationValues(): void {
    this.notificationService.getNotificationValues()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: values => this.notificationValues.set(values),
        error: () => {
          this.notificationValues.set([]);
          this.errorService.setError('Failed to load notification channels. Please refresh the page.');
        }
      });
  }

  loadZones(): void {
    this.zoneService.getZones({ pageSize: 500 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: r => this.zones.set(r.items),
        error: () => {
          this.zones.set([]);
          this.errorService.setError('Failed to load zones. Please refresh the page.');
        }
      });
  }

  loadUsers(): void {
    // Load up to 100 users for the recipient dropdown. If the tenant has more,
    // a server-side search endpoint should be added for scalability.
    this.usersService.getUsers({ pageNumber: 1, pageSize: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: r => this.users.set(r.items),
        error: () => {
          this.users.set([]);
          this.errorService.setError('Failed to load users. Please refresh the page.');
        }
      });
  }

  loadRules(pageNumber: number, pageSize: number): void {
    if (this.isLoading) return;
    const timeframeSearch = this.timeframeSearch().trim() || undefined;
    const active = this.activeFilter();
    if (
      this.lastLoadParams &&
      this.lastLoadParams.pageNumber === pageNumber &&
      this.lastLoadParams.pageSize === pageSize &&
      this.lastLoadParams.timeframeSearch === timeframeSearch &&
      this.lastLoadParams.active === active
    ) {
      return;
    }
    this.lastLoadParams = { pageNumber, pageSize, timeframeSearch, active };
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.errorService.clearError();

    this.notificationService
      .getNotificationRules({ timeframeSearch, active, pageNumber, pageSize })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.rules.set(result.items);
          this.totalRecords.set(result.totalCount);
          this.loadingService.setLoading(false);
          this.isLoading = false;
        },
        error: err => {
          this.errorService.setErrorFromHttp(err);
          this.loadingService.setLoading(false);
          this.isLoading = false;
          this.lastLoadParams = null;
        }
      });
  }

  applyFilters(): void {
    this.lastLoadParams = null;
    this.loadRules(1, this.pageSize());
  }

  clearFilters(): void {
    this.timeframeSearch.set('');
    this.activeFilter.set(undefined);
    this.lastLoadParams = null;
    this.loadRules(1, this.pageSize());
  }

  showCreateForm(): void {
    this.editingRule.set(null);
    this.formData = {
      userId: undefined,
      zoneId: undefined,
      timeframe: '',
      notificationValueId: undefined,
      active: true
    };
    this.showModal.set(true);
  }

  editRule(rule: NotificationRule): void {
    this.editingRule.set(rule);
    this.formData = {
      userId: rule.userId,
      zoneId: rule.zoneId,
      timeframe: rule.timeframe,
      notificationValueId: rule.notificationValueId,
      active: rule.active
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingRule.set(null);
  }

  saveRule(): void {
    if (!this.formData.userId) {
      this.errorService.setError('Recipient user is required');
      return;
    }
    if (!this.formData.zoneId) {
      this.errorService.setError('Zone is required');
      return;
    }
    if (!this.formData.timeframe.trim()) {
      this.errorService.setError('Timeframe is required (e.g. 8:00 pm-5:00 am)');
      return;
    }
    if (!this.formData.notificationValueId) {
      this.errorService.setError('Notification channel is required');
      return;
    }

    this.loadingService.setLoading(true);
    this.errorService.clearError();

    const editing = this.editingRule();
    if (editing) {
      const request: UpdateNotificationRuleRequest = {
        id: editing.id,
        userId: this.formData.userId,
        zoneId: this.formData.zoneId,
        timeframe: this.formData.timeframe.trim(),
        notificationValueId: this.formData.notificationValueId,
        active: this.formData.active
      };
      this.notificationService
        .updateNotificationRule(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Notification rule updated successfully.');
            this.lastLoadParams = null;
            this.loadRules(1, this.pageSize());
            this.closeModal();
          },
          error: err => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    } else {
      const request: CreateNotificationRuleRequest = {
        userId: this.formData.userId,
        zoneId: this.formData.zoneId,
        timeframe: this.formData.timeframe.trim(),
        notificationValueId: this.formData.notificationValueId,
        active: this.formData.active
      };
      this.notificationService
        .createNotificationRule(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.errorService.setSuccess('Notification rule created successfully.');
            this.lastLoadParams = null;
            this.loadRules(1, this.pageSize());
            this.closeModal();
          },
          error: err => {
            this.errorService.setErrorFromHttp(err);
            this.loadingService.setLoading(false);
          }
        });
    }
  }

  deleteRule(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this notification rule?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loadingService.setLoading(true);
        this.errorService.clearError();
        this.notificationService
          .deleteNotificationRule(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.errorService.setSuccess('Notification rule deleted successfully.');
              this.lastLoadParams = null;
              this.loadRules(1, this.pageSize());
            },
            error: err => {
              this.errorService.setErrorFromHttp(err);
              this.loadingService.setLoading(false);
            }
          });
      }
    });
  }

  clearError = (): void => this.errorService.clearError();

  onLazyLoad(event: TableLazyLoadEvent): void {
    const pageSize = event.rows ?? 10;
    const first = event.first ?? 0;
    const pageNumber = Math.floor(first / pageSize) + 1;
    if (this.pageSize() !== pageSize) this.pageSize.set(pageSize);
    this.loadRules(pageNumber, pageSize);
  }

  trackById(index: number, rule: NotificationRule): number {
    return rule.id;
  }
}
