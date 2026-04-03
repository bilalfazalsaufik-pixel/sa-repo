import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  NotificationHistoryItem,
  GetNotificationHistoryParams
} from '../../../shared/models/notification.model';
import { PagedResult } from '../../../shared/models/paged-result.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationHistoryService {
  private readonly api = inject(ApiService);
  private readonly endpoint = 'notificationrule/history';

  getNotificationHistory(params: GetNotificationHistoryParams = {}): Observable<PagedResult<NotificationHistoryItem>> {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params.fromDate != null && params.fromDate !== '') queryParams['fromDate'] = params.fromDate;
    if (params.toDate != null && params.toDate !== '') queryParams['toDate'] = params.toDate;
    if (params.ruleId != null) queryParams['ruleId'] = params.ruleId;
    if (params.recipientUserId != null) queryParams['recipientUserId'] = params.recipientUserId;
    if (params.channel != null && params.channel !== '') queryParams['channel'] = params.channel;
    if (params.status != null && params.status !== '') queryParams['status'] = params.status;
    if (params.pageNumber != null) queryParams['pageNumber'] = params.pageNumber;
    if (params.pageSize != null) queryParams['pageSize'] = params.pageSize;

    return this.api.get<PagedResult<NotificationHistoryItem>>(this.endpoint, queryParams);
  }
}
