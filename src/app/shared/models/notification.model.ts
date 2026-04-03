export interface NotificationRule {
  id: number;
  userId: number;
  userName: string;
  zoneId: number;
  zoneName: string;
  timeframe: string;
  notificationValueId: number;
  notificationValueName: string; // "Email" | "SMS" | "Both" | "None"
  active: boolean;
  createdDate: string;
  lastModifiedDate?: string;
}

export interface NotificationValue {
  id: number;
  name: string;
}

export interface NotificationHistoryItem {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  recipientUserName: string;
  notificationRuleId: number;
  ruleName: string;
  channel: string;
  recipient: string;
  subject: string;
  body: string;
  success: boolean;
  status: string;
  errorMessage?: string;
  sentAt: string;
}

export interface GetNotificationHistoryParams {
  fromDate?: string;
  toDate?: string;
  ruleId?: number;
  recipientUserId?: number;
  channel?: string;
  status?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateNotificationRuleRequest {
  userId: number;
  zoneId: number;
  timeframe: string;
  notificationValueId: number;
  active?: boolean;
}

export interface UpdateNotificationRuleRequest {
  id: number;
  userId: number;
  zoneId: number;
  timeframe: string;
  notificationValueId: number;
  active: boolean;
}
