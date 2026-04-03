import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Role, ScreenDto, ScreenPermissionDto, CreateRoleRequest, UpdateRoleRequest } from '../../../shared/models/role.model';
import { PagedResult } from '../../../shared/models/paged-result.model';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private api = inject(ApiService);

  getRoles(params: {
    tenantId?: number;
    pageNumber?: number;
    pageSize?: number;
    nameSearch?: string;
  } = {}): Observable<PagedResult<Role>> {
    return this.api.get<PagedResult<Role>>('role', params as Record<string, number | string | undefined>);
  }

  getRoleById(id: number): Observable<Role> {
    return this.api.get<Role>(`role/${id}`);
  }

  createRole(request: CreateRoleRequest): Observable<Role> {
    return this.api.post<Role>('role', request);
  }

  updateRole(request: UpdateRoleRequest): Observable<Role> {
    return this.api.put<Role>(`role/${request.id}`, request);
  }

  deleteRole(id: number): Observable<void> {
    return this.api.delete<void>(`role/${id}`);
  }

  getScreens(): Observable<ScreenDto[]> {
    return this.api.get<ScreenDto[]>('permission/screens');
  }

  getRoleScreenPermissions(roleId: number): Observable<ScreenPermissionDto[]> {
    return this.api.get<ScreenPermissionDto[]>(`role/${roleId}/screen-permissions`);
  }

  setRoleScreenPermissions(roleId: number, screens: ScreenPermissionDto[]): Observable<void> {
    return this.api.put<void>(`role/${roleId}/screen-permissions`, { roleId, screens });
  }
}
