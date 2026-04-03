import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { NotificationHistoryService } from '../../services/notification-history.service';
import { NotificationService } from '../../services/notification.service';
import { UsersService } from '../../../users/services/users.service';
import { NotificationHistoryItem } from '../../../../shared/models/notification.model';
import { NotificationRule } from '../../../../shared/models/notification.model';
import { UserListItem } from '../../../users/models/user-list-item.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';

@Component({
  selector: 'app-notification-history-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardModule,
    TableModule,
    ButtonModule,
    DropdownModule,
    CalendarModule,
    TagModule,
    TooltipModule,
    ErrorMessageComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notification-history-list.component.html',
  styleUrls: ['./notification-history-list.component.css'],
})
export class NotificationHistoryListComponent implements OnInit {
  history = signal<NotificationHistoryItem[]>([]);
  totalRecords = signal(0);
  pageSize = signal(10);
  tableFirst = signal(0);

  fromDate: Date | null = null;
  toDate: Date | null = null;
  filterRuleId: number | null = null;
  filterRecipientUserId: number | null = null;
  filterChannel: string | null = null;
  filterStatus: string | null = null;

  private isLoading = false;
  private lastLoadParams: {
    pageNumber: number;
    pageSize: number;
    fromDate?: string;
    toDate?: string;
    ruleId?: number;
    recipientUserId?: number;
    channel?: string;
    status?: string;
  } | null = null;

  rules = signal<NotificationRule[]>([]);
  users = signal<UserListItem[]>([]);

  channelOptions = [
    { label: 'All channels', value: null },
    { label: 'Email', value: 'Email' },
    { label: 'SMS', value: 'SMS' },
  ];
  statusFilterOptions = [
    { label: 'All statuses', value: null },
    { label: 'Sent', value: 'Sent' },
    { label: 'Failed', value: 'Failed' },
  ];

  ruleOptions = signal<{ label: string; value: number | null }[]>([]);
  recipientOptions = signal<{ label: string; value: number | null }[]>([]);

  private historyService = inject(NotificationHistoryService);
  private notificationService = inject(NotificationService);
  private usersService = inject(UsersService);
  private permissionService = inject(PermissionService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  canViewNotifications = computed(() => this.permissionService.hasPermission('View Notifications'));

  ngOnInit(): void {
    this.loadRulesForFilter();
    this.loadUsersForFilter();
    this.loadHistory(1, this.pageSize());
  }

  loadRulesForFilter(): void {
    this.notificationService
      .getNotificationRules({ pageNumber: 1, pageSize: 500 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.rules.set(r.items);
          this.ruleOptions.set([
            { label: 'All rules', value: null },
            ...r.items.map((rule) => ({ label: `${rule.zoneName} / ${rule.timeframe}`, value: rule.id })),
          ]);
        },
        error: () => this.rules.set([]),
      });
  }

  loadUsersForFilter(): void {
    this.usersService
      .getUsers({ pageNumber: 1, pageSize: 500 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.users.set(r.items);
          this.recipientOptions.set([
            { label: 'All recipients', value: null },
            ...r.items.map((u) => ({
              label: `${u.firstName} ${u.lastName}`.trim() || u.email,
              value: u.userId,
            })),
          ]);
        },
        error: () => this.users.set([]),
      });
  }

  loadHistory(pageNumber: number, pageSize: number): void {
    if (this.isLoading) return;
    const fromStr = this.fromDate ? this.fromDate.toISOString().slice(0, 10) : undefined;
    const toStr = this.toDate ? this.toDate.toISOString().slice(0, 10) : undefined;
    const ruleId = this.filterRuleId ?? undefined;
    const recipientUserId = this.filterRecipientUserId ?? undefined;
    const channel = this.filterChannel ?? undefined;
    const status = this.filterStatus ?? undefined;

    if (
      this.lastLoadParams &&
      this.lastLoadParams.pageNumber === pageNumber &&
      this.lastLoadParams.pageSize === pageSize &&
      this.lastLoadParams.fromDate === fromStr &&
      this.lastLoadParams.toDate === toStr &&
      this.lastLoadParams.ruleId === ruleId &&
      this.lastLoadParams.recipientUserId === recipientUserId &&
      this.lastLoadParams.channel === channel &&
      this.lastLoadParams.status === status
    ) {
      return;
    }
    this.lastLoadParams = {
      pageNumber,
      pageSize,
      fromDate: fromStr,
      toDate: toStr,
      ruleId,
      recipientUserId,
      channel,
      status,
    };
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.errorService.clearError();

    this.historyService
      .getNotificationHistory({
        fromDate: fromStr,
        toDate: toStr,
        ruleId,
        recipientUserId,
        channel,
        status,
        pageNumber,
        pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.history.set(result.items);
          this.totalRecords.set(result.totalCount);
          this.loadingService.setLoading(false);
          this.isLoading = false;
        },
        error: (err) => {
          this.errorService.setErrorFromHttp(err);
          this.history.set([]);
          this.totalRecords.set(0);
          this.loadingService.setLoading(false);
          this.isLoading = false;
          this.lastLoadParams = null;
        },
      });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const page = event.first != null && event.rows != null ? Math.floor(event.first / event.rows) + 1 : 1;
    const pageSize = event.rows ?? 10;
    this.pageSize.set(pageSize);
    this.tableFirst.set(event.first ?? 0);
    this.loadHistory(page, pageSize);
  }

  applyFilters(): void {
    this.lastLoadParams = null;
    this.loadHistory(1, this.pageSize());
  }

  clearFilters(): void {
    this.fromDate = null;
    this.toDate = null;
    this.filterRuleId = null;
    this.filterRecipientUserId = null;
    this.filterChannel = null;
    this.filterStatus = null;
    this.lastLoadParams = null;
    this.loadHistory(1, this.pageSize());
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (status?.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'info';
    }
  }

  trackById(_index: number, item: NotificationHistoryItem): number {
    return item.id;
  }

  clearError = (): void => this.errorService.clearError();
}
