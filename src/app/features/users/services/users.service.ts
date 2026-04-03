import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseCachedService } from '../../../core/services/base-cached.service';
import { PagedResult } from '../../../shared/models/paged-result.model';
import { UserListItem, CreateUserRequest, UpdateUserRequest } from '../models/user-list-item.model';

@Injectable({
  providedIn: 'root'
})
export class UsersService extends BaseCachedService<UserListItem> {
  getUsers(params: { pageNumber?: number; pageSize?: number; tenantId?: number } = {}): Observable<PagedResult<UserListItem>> {
    const queryParams: Record<string, number | undefined> = {};
    if (params.tenantId != null) queryParams['tenantId'] = params.tenantId;
    return this.getCached('user/list', queryParams, params.pageNumber, params.pageSize);
  }

  getUserById(id: number): Observable<UserListItem> {
    return this.getById('user', id);
  }

  createUser(request: CreateUserRequest): Observable<UserListItem> {
    return this.create('user', request);
  }

  updateUser(request: UpdateUserRequest): Observable<UserListItem> {
    return this.update('user', request.id, request);
  }

  deleteUser(id: number): Observable<void> {
    return this.delete('user', id);
  }
}
