import React, { useState } from 'https://esm.sh/react@18.2.0';
import { Sidebar } from '../navigation/Sidebar.jsx';
import { TopNav } from '../navigation/TopNav.jsx';
import { Footer } from './Footer.jsx';
import { Drawer } from '../ui/Drawer.jsx';

export const AppLayout = ({ children, globalNav, onSelectNav, projectId, onSelectProject }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  /* Determine active nav for Sidebar backward compatibility */
  const sidebarActiveNav = globalNav || activeNav;

  return (
    React.createElement('div', { className: 'app-container' },
      /* Sticky Sidebar Navigation */
      React.createElement(Sidebar, {
        isCollapsed: isSidebarCollapsed,
        onToggle: () => setIsSidebarCollapsed(!isSidebarCollapsed),
        activeNav: sidebarActiveNav,
        onSelectNav
      }),

      /* Main Content & Top Header Area */
      React.createElement('div', { className: 'app-main-wrapper' },
        React.createElement(TopNav, {
          onOpenNotifications: () => setIsNotificationsOpen(true)
        }),
        React.createElement('main', { className: 'app-content' }, children),
        React.createElement(Footer, null)
      ),

      /* Notifications Right Utility Drawer Panel */
      React.createElement(Drawer, {
        isOpen: isNotificationsOpen,
        onClose: () => setIsNotificationsOpen(false),
        title: 'System Notifications'
      },
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
          [
            { title: 'Data Ingestion Completed', time: '10 mins ago', desc: 'Snowflake pipeline synced 1,420,000 records successfully.', type: 'info' },
            { title: 'Model Performance Alert', time: '1 hour ago', desc: 'Customer Churn Predictor v2 drift exceeded 0.05 threshold.', type: 'warning' },
            { title: 'Daily Automated Report', time: '4 hours ago', desc: 'Q3 Financial Forecast PDF report generated.', type: 'info' }
          ].map((notif, idx) => React.createElement('div', {
            key: idx,
            style: {
              padding: 14, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)'
            }
          },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
              React.createElement('span', { className: 'font-button' }, notif.title),
              React.createElement('span', { className: 'font-caption', style: { color: 'var(--text-tertiary)' } }, notif.time)
            ),
            React.createElement('p', { className: 'font-body', style: { color: 'var(--text-secondary)' } }, notif.desc)
          ))
        )
      )
    )
  );
};
