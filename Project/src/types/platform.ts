/**
 * InsightIQ AI - Enterprise Collaboration & Platform Feature Contracts
 */

export interface Workspace {
  id: string;
  owner_id: string;
  workspace_name: string;
  description?: string | null;
  is_personal: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedAnalysis {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  dataset_id?: string | null;
  dataset_version_id?: string | null;
  analysis_name: string;
  analysis_type: 'bi' | 'statistical' | 'predictive' | 'xai' | 'benchmark' | string;
  selected_columns: string[];
  filters: Record<string, any>;
  statistical_config?: Record<string, any>;
  bi_config?: Record<string, any>;
  ai_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SavedDashboard {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  dataset_id?: string | null;
  layout_name: string;
  description?: string | null;
  widgets: any[];
  filters?: Record<string, any>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ReportItem {
  id: string;
  user_id: string;
  dataset_id?: string | null;
  summary: string;
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  pdf_url?: string | null;
  created_at: string;
}

export type ResourceType = 'dashboard' | 'report' | 'analysis';
export type AccessPermission = 'owner' | 'editor' | 'viewer';
export type ShareStatus = 'active' | 'revoked' | 'expired';

export interface ResourceShare {
  id: string;
  resource_type: ResourceType;
  resource_id: string;
  owner_id: string;
  share_token: string;
  share_status: ShareStatus;
  access_permission: AccessPermission;
  expiration?: string | null;
  created_at: string;
}

export interface PlatformSettings {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  currency: string;
  email_notifications: boolean;
  dashboard_preferences?: Record<string, any>;
  notification_preferences?: Record<string, any>;
  default_dataset_behavior?: Record<string, any>;
  visualization_preferences?: Record<string, any>;
}
