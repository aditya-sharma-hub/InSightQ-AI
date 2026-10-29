import { supabase } from '../../lib/supabase.js';
import { RealtimeCallback, RealtimeNotification } from '../../types/realtime.js';

export const RealtimeService = {
  activeChannels: new Map<string, any>(),

  /**
   * Helper to create or retrieve a cached channel with RLS user filter
   */
  getChannel(channelName: string, table: string, userId: string, callback: RealtimeCallback) {
    if (this.activeChannels.has(channelName)) {
      return this.activeChannels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${userId}`
        },
        (payload) => callback({
          eventType: payload.eventType as any,
          new: payload.new,
          old: payload.old,
          table: payload.table,
          schema: payload.schema
        })
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[InsightIQ AI Realtime] Channel '${channelName}' subscribed for user: ${userId}`);
        }
      });

    this.activeChannels.set(channelName, channel);
    return channel;
  },

  /**
   * 1. subscribeToDatasets: Listen to dataset uploads, updates, processing, and deletions
   */
  subscribeToDatasets(userId: string, callback: RealtimeCallback) {
    const channelName = `datasets:${userId}`;
    return this.getChannel(channelName, 'datasets', userId, callback);
  },

  /**
   * 2. subscribeToKPIs: Listen to KPI metric updates
   */
  subscribeToKPIs(userId: string, callback: RealtimeCallback) {
    const channelName = `kpis:${userId}`;
    return this.getChannel(channelName, 'business_kpis', userId, callback);
  },

  /**
   * 3. subscribeToForecasts: Listen to forecast model completion & training status
   */
  subscribeToForecasts(userId: string, callback: RealtimeCallback) {
    const channelName = `forecasts:${userId}`;
    return this.getChannel(channelName, 'forecast_jobs', userId, callback);
  },

  /**
   * 4. subscribeToReports: Listen to executive report and PDF generation events
   */
  subscribeToReports(userId: string, callback: RealtimeCallback) {
    const channelName = `reports:${userId}`;
    return this.getChannel(channelName, 'executive_reports', userId, callback);
  },

  /**
   * 5. subscribeToNotifications: Listen to user activity & instant system notifications
   */
  subscribeToNotifications(userId: string, callback: (notif: RealtimeNotification) => void) {
    const channelName = `notifications:${userId}`;
    
    if (this.activeChannels.has(channelName)) {
      return this.activeChannels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_activity', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const newActivity = payload.new;
          const notification: RealtimeNotification = {
            id: newActivity.id || `notif_${Date.now()}`,
            category: newActivity.action?.toLowerCase().includes('upload') ? 'dataset_uploaded' : 'insight_generated',
            title: newActivity.action || 'System Notification',
            message: `Event processed: ${newActivity.action}`,
            timestamp: newActivity.created_at || new Date().toISOString(),
            read: false
          };
          callback(notification);
        }
      )
      .subscribe();

    this.activeChannels.set(channelName, channel);
    return channel;
  },

  /**
   * 6. subscribeToDashboard: Combined dashboard metrics channel for specific dataset
   */
  subscribeToDashboard(userId: string, datasetId: string, callback: RealtimeCallback) {
    const channelName = `dashboard:${userId}:${datasetId}`;
    if (this.activeChannels.has(channelName)) {
      return this.activeChannels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dashboard_metrics', filter: `user_id=eq.${userId}` },
        (payload) => callback({
          eventType: payload.eventType as any,
          new: payload.new,
          old: payload.old,
          table: payload.table,
          schema: payload.schema
        })
      )
      .subscribe();

    this.activeChannels.set(channelName, channel);
    return channel;
  },

  /**
   * 7. subscribeToBenchmarks: Listen to benchmark updates and evaluation results
   */
  subscribeToBenchmarks(userId: string, callback: RealtimeCallback) {
    const channelName = `benchmarks:${userId}`;
    return this.getChannel(channelName, 'benchmark_results', userId, callback);
  },

  /**
   * Unsubscribe a specific channel by name
   */
  unsubscribe(channelName: string) {
    const channel = this.activeChannels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.activeChannels.delete(channelName);
      console.log(`[InsightIQ AI Realtime] Unsubscribed channel: ${channelName}`);
    }
  },

  /**
   * Unsubscribe all active realtime channels
   */
  unsubscribeAll() {
    this.activeChannels.forEach((channel, name) => {
      supabase.removeChannel(channel);
      console.log(`[InsightIQ AI Realtime] Unsubscribed channel: ${name}`);
    });
    this.activeChannels.clear();
  }
};
