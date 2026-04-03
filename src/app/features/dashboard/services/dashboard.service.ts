import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { DashboardData, DashboardSummary, GetDashboardDataParams } from '../../../shared/models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private api = inject(ApiService);

  getDashboardData(params?: GetDashboardDataParams): Observable<DashboardData> {
    return this.api.get<DashboardData>('dashboard', params as Record<string, string | number | undefined>);
  }

  getDashboardSummary(siteId?: number): Observable<DashboardSummary> {
    const params: Record<string, number | undefined> = {};
    if (siteId != null) params['siteId'] = siteId;
    return this.api.get<DashboardSummary>('dashboard/summary', params);
  }
}
