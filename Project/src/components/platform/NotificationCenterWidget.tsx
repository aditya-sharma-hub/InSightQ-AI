import React, { useState } from 'https://esm.sh/react@18.2.0';
import { Notification, NotificationSeverity } from '../../types/platform.js';
import { NotificationService } from '../../services/platform/platformServices.js';

interface NotificationCenterWidgetProps {
  userId: string;
  notifications: Notification[];
  unreadCount: number;
  onRefresh?: () => void;
}

export const NotificationCenterWidget: React.FC<NotificationCenterWidgetProps> = ({
  userId,
  notifications,
  unreadCount,
  onRefresh
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkRead = async (id: string) => {
    try {
      await NotificationService.markNotificationRead(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('[Notification Mark Read Error]', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await NotificationService.markAllNotificationsRead(userId);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('[Notification Mark All Read Error]', err);
    }
  };

  const getSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'success':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40';
      case 'warning':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/40';
      case 'error':
        return 'bg-rose-950/80 text-rose-400 border-rose-800/40';
      default:
        return 'bg-blue-950/80 text-blue-400 border-blue-800/40';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center p-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 transition-colors"
      >
        <span className="text-xs font-medium">🔔 Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/60">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">System Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold uppercase tracking-wider"
              >
                Mark All Read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-800/60">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                No notifications logged. System events will appear here in realtime.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={`p-3.5 hover:bg-gray-800/40 transition-colors cursor-pointer ${!n.read ? 'bg-blue-950/20' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] px-2 py-0.5 rounded border uppercase font-bold ${getSeverityBadge(n.severity)}`}>
                      {n.severity}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h5 className="text-xs font-semibold text-white">{n.title}</h5>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
