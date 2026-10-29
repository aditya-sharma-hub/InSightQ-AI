import { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import { RealtimeService } from '../services/realtime/realtimeService.js';
import { RealtimeNotification, RealtimePayload } from '../types/realtime.js';

/**
 * Hook: Listen to realtime dataset events
 */
export function useRealtimeDatasets(userId: string | null) {
  const [lastDatasetEvent, setLastDatasetEvent] = useState<RealtimePayload | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channelName = `datasets:${userId}`;
    RealtimeService.subscribeToDatasets(userId, (payload) => {
      setLastDatasetEvent(payload);
    });

    return () => {
      RealtimeService.unsubscribe(channelName);
    };
  }, [userId]);

  return lastDatasetEvent;
}

/**
 * Hook: Listen to realtime KPI metric changes
 */
export function useRealtimeKPIs(userId: string | null) {
  const [lastKPIEvent, setLastKPIEvent] = useState<RealtimePayload | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channelName = `kpis:${userId}`;
    RealtimeService.subscribeToKPIs(userId, (payload) => {
      setLastKPIEvent(payload);
    });

    return () => {
      RealtimeService.unsubscribe(channelName);
    };
  }, [userId]);

  return lastKPIEvent;
}

/**
 * Hook: Listen to realtime forecast job completion
 */
export function useRealtimeForecast(userId: string | null) {
  const [lastForecastEvent, setLastForecastEvent] = useState<RealtimePayload | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channelName = `forecasts:${userId}`;
    RealtimeService.subscribeToForecasts(userId, (payload) => {
      setLastForecastEvent(payload);
    });

    return () => {
      RealtimeService.unsubscribe(channelName);
    };
  }, [userId]);

  return lastForecastEvent;
}

/**
 * Hook: Listen to realtime executive report generation
 */
export function useRealtimeReports(userId: string | null) {
  const [lastReportEvent, setLastReportEvent] = useState<RealtimePayload | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channelName = `reports:${userId}`;
    RealtimeService.subscribeToReports(userId, (payload) => {
      setLastReportEvent(payload);
    });

    return () => {
      RealtimeService.unsubscribe(channelName);
    };
  }, [userId]);

  return lastReportEvent;
}

/**
 * Hook: Listen to realtime dashboard metrics updates for a specific dataset
 */
export function useRealtimeDashboard(userId: string | null, datasetId: string | null) {
  const [lastDashboardEvent, setLastDashboardEvent] = useState<RealtimePayload | null>(null);

  useEffect(() => {
    if (!userId || !datasetId) return;

    const channelName = `dashboard:${userId}:${datasetId}`;
    RealtimeService.subscribeToDashboard(userId, datasetId, (payload) => {
      setLastDashboardEvent(payload);
    });

    return () => {
      RealtimeService.unsubscribe(channelName);
    };
  }, [userId, datasetId]);

  return lastDashboardEvent;
}

/**
 * Hook: Listen to instant realtime notifications
 */
export function useRealtimeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);

  useEffect(() => {
    if (!userId) return;

    const channelName = `notifications:${userId}`;
    RealtimeService.subscribeToNotifications(userId, (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
    });

    return () => {
      RealtimeService.unsubscribe(channelName);
    };
  }, [userId]);

  return notifications;
}
