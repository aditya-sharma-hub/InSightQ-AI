/**
 * InsightIQ AI - Supabase Realtime Contracts & Notification Types
 */

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export type NotificationCategory = 
  | 'dataset_uploaded'
  | 'dataset_failed'
  | 'analysis_complete'
  | 'forecast_ready'
  | 'pdf_ready'
  | 'insight_generated';

export interface RealtimeNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  dataset_id?: string;
  timestamp: string;
  read: boolean;
}

export interface RealtimePayload<T = any> {
  eventType: RealtimeEventType;
  new: T;
  old: Partial<T>;
  table: string;
  schema: string;
}

export type RealtimeCallback<T = any> = (payload: RealtimePayload<T>) => void;
