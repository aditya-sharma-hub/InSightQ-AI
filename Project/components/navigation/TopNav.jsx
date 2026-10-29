import React, { useState } from 'https://esm.sh/react@18.2.0';
import {
  SearchIcon, BellIcon, SunIcon, MoonIcon, MonitorIcon,
  ChevronDownIcon, UserIcon, SettingsIcon, CheckIcon
} from '../../assets/icons/icons.js';
import { useTheme } from '../../theme/ThemeContext.js';
import { Avatar } from '../ui/Badge.jsx';
import { Popover } from '../ui/Tooltip.jsx';

export const TopNav = ({ onOpenSearch, onOpenNotifications }) => {
  const { mode, setMode } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    React.createElement('header', { className: 'app-header' },
      /* Left: InsightIQ Brand */
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 16 } },
        React.createElement('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: 8,
            fontWeight: 700, fontSize: '0.98rem', letterSpacing: '-0.02em', color: 'var(--text-primary)'
          }
        },
          React.createElement('span', null, 'InsightIQ'),
          React.createElement('span', { style: { color: 'var(--color-primary-500)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' } }, 'Enterprise AI')
        )
      ),

      /* Middle: Global Quick Search Launcher */
      React.createElement('div', { style: { flex: 1, maxWidth: 440, margin: '0 24px' } },
        React.createElement('button', {
          onClick: onOpenSearch,
          style: {
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            padding: '8px 16px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            boxShadow: 'var(--shadow-xs)'
          }
        },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            React.createElement(SearchIcon, { size: 16 }),
            React.createElement('span', null, 'Search datasets, queries, dashboards...')
          ),
          React.createElement('span', { className: 'badge' }, '⌘K')
        )
      ),

      /* Right: Action Utilities */
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },

        /* Theme Toggle (Light / Dark / System) */
        React.createElement('button', {
          className: 'btn btn-ghost btn-sm',
          onClick: () => setMode(mode === 'dark' ? 'light' : 'dark'),
          'aria-label': 'Toggle theme',
          title: `Current Mode: ${mode}`
        },
          mode === 'dark' ? React.createElement(MoonIcon, { size: 18 }) : React.createElement(SunIcon, { size: 18 })
        ),

        /* Notifications Bell */
        React.createElement('button', {
          className: 'btn btn-ghost btn-sm',
          onClick: onOpenNotifications,
          'aria-label': 'Notifications',
          style: { position: 'relative' }
        },
          React.createElement(BellIcon, { size: 18 }),
          React.createElement('span', {
            style: {
              position: 'absolute', top: 6, right: 6, width: 8, height: 8,
              borderRadius: '50%', backgroundColor: 'var(--color-primary-500)'
            }
          })
        ),

        /* User Profile Popover */
        React.createElement(Popover, {
          isOpen: isProfileOpen,
          onToggle: () => setIsProfileOpen(!isProfileOpen),
          trigger: React.createElement('button', {
            style: { background: 'none', border: 'none', cursor: 'pointer', padding: 2 }
          },
            React.createElement(Avatar, { name: 'Alex Rivera', size: 34 })
          )
        },
          React.createElement('div', { style: { width: 200 } },
            React.createElement('div', { style: { paddingBottom: 12, marginBottom: 8, borderBottom: '1px solid var(--border-subtle)' } },
              React.createElement('div', { className: 'font-button' }, 'Alex Rivera'),
              React.createElement('div', { className: 'font-caption', style: { color: 'var(--text-tertiary)' } }, 'alex.rivera@insightiq.ai')
            ),
            React.createElement('button', { className: 'btn btn-ghost btn-sm', style: { width: '100%', justifyContent: 'flex-start', gap: 8 } },
              React.createElement(UserIcon, { size: 16 }), 'Profile & Account'
            ),
            React.createElement('button', { className: 'btn btn-ghost btn-sm', style: { width: '100%', justifyContent: 'flex-start', gap: 8 } },
              React.createElement(SettingsIcon, { size: 16 }), 'Workspace Settings'
            )
          )
        )
      )
    )
  );
};