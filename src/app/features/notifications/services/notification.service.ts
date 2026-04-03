import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseCachedService } from '../../../core/services/base-cached.service';
import {
  NotificationRule,
  NotificationValue,
  CreateNotificationRuleRequest,
  UpdateNotificationRuleRequest
} from '../../../shared/models/notification.model';
import { PagedResult } from '../../../shared/models/paged-result.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService extends BaseCachedService<NotificationRule> {
  private readonly endpoint = 'notificationrule';

  getNotificationValues(): Observable<NotificationValue[]> {
    return this.api.get<NotificationValue[]>(`${this.endpoint}/values`);
  }

  getNotificationRules(params: {
    userId?: number;
    zoneId?: number;
    timeframeSearch?: string;
    notificationValueId?: number;
    active?: boolean;
    pageNumber?: number;
    pageSize?: number;
  } = {}): Observable<PagedResult<NotificationRule>> {
    const { userId, zoneId, timeframeSearch, notificationValueId, active, pageNumber, pageSize } = params;
    const queryParams: Record<string, string | number | boolean | undefined> = {};
    if (userId != null) queryParams['userId'] = userId;
    if (zoneId != null) queryParams['zoneId'] = zoneId;
    if (timeframeSearch != null && timeframeSearch !== '') queryParams['timeframeSearch'] = timeframeSearch;
    if (notificationValueId != null) queryParams['notificationValueId'] = notificationValueId;
    if (active != null) queryParams['active'] = active;
    return this.getCached(this.endpoint, queryParams, pageNumber, pageSize);
  }

  getNotificationRuleById(id: number): Observable<NotificationRule> {
    return this.getById(this.endpoint, id);
  }

  createNotificationRule(request: CreateNotificationRuleRequest): Observable<NotificationRule> {
    return this.create(this.endpoint, {
      ...request,
      active: request.active ?? true
    });
  }

  updateNotificationRule(request: UpdateNotificationRuleRequest): Observable<NotificationRule> {
    return this.update(this.endpoint, request.id, request);
  }

  deleteNotificationRule(id: number): Observable<void> {
    return this.delete(this.endpoint, id);
  }
}
