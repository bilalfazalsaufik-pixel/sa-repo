import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Maintenance, GetMaintenancesQueryParams, UpdateMaintenanceRequest } from '../../../shared/models/maintenance.model';
import { PagedResult } from '../../../shared/models/paged-result.model';

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  private api = inject(ApiService);

  getMaintenances(params?: GetMaintenancesQueryParams): Observable<PagedResult<Maintenance>> {
    return this.api.get<PagedResult<Maintenance>>('maintenance', params);
  }

  getMaintenanceById(id: number): Observable<Maintenance> {
    return this.api.get<Maintenance>(`maintenance/${id}`);
  }

  createMaintenance(sensorId: number, userId: number, message: string): Observable<Maintenance> {
    return this.api.post<Maintenance>('maintenance', { sensorId, userId, message });
  }

  updateMaintenance(request: UpdateMaintenanceRequest): Observable<Maintenance> {
    return this.api.put<Maintenance>(`maintenance/${request.id}`, request);
  }

  deleteMaintenance(id: number): Observable<void> {
    return this.api.delete<void>(`maintenance/${id}`);
  }
}
