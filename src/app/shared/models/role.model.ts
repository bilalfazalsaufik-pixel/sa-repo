export interface Role {
  id: number;
  name: string;
  description: string;
  isSystemRole: boolean;
  isSystemWide: boolean;
  tenantId?: number;
  tenantName?: string;
  createdDate: string;
  lastModifiedDate?: string;
}

export interface ScreenDto {
  key: string;
  displayName: string;
}

export type ScreenAccessLevel = 0 | 1 | 2; // None=0, View=1, Manage=2

export const ScreenAccessLevels: Record<string, ScreenAccessLevel> = {
  None: 0,
  View: 1,
  Manage: 2
};

export interface ScreenPermissionDto {
  screenKey: string;
  access: ScreenAccessLevel;
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  isSystemWide: boolean;
}

export interface UpdateRoleRequest {
  id: number;
  name: string;
  description: string;
}
