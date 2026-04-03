export interface UserRoleDto {
  roleId: number;
  roleName: string;
}

export interface UserListItem {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roles: UserRoleDto[];
  tenantId?: number;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  roleIds: number[];
  tenantId?: number;
}

export interface UpdateUserRequest {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  roleIds: number[];
}
