export interface Maintenance {
  id: number;
  sensorId: number;
  sensorName: string;
  deviceId: number;
  deviceName: string;
  siteId: number;
  siteName: string;
  zoneName: string;
  userId: number;
  userName: string;
  message: string;
  createdDate: string;
}

export interface UpdateMaintenanceRequest {
  id: number;
  message: string;
}

export interface GetMaintenancesQueryParams {
  [key: string]: string | number | boolean | Date | null | undefined;
  sensorId?: number;
  userId?: number;
  startDate?: string;
  endDate?: string;
  pageNumber?: number;
  pageSize?: number;
}
