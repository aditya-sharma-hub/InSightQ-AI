import React from 'https://esm.sh/react@18.2.0';
import {
  SidebarIcon, DatabaseIcon, BarChart2Icon, SparklesIcon,
  LayersIcon, SettingsIcon, FolderIcon, HelpCircleIcon, ChevronRightIcon
} from '../../assets/icons/icons.js';
import { Tooltip } from '../ui/Tooltip.jsx';

export const Sidebar = ({ isCollapsed = false, onToggle, activeNav = 'dashboard', onSelectNav }) => {
  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2Icon, badge: null },
    { id: 'projects', label: 'Projects', icon: FolderIcon, badge: null },
  ];

  const aiNavItems = [
    { id: 'ai_copilot', label: 'AI Copilot', icon: SparklesIcon, badge: null },
  ];

  const accountNavItems = [
    { id: 'profile', label: 'Profile', icon: UserIcon, badge: null },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, badge: null },
  ];

  return (
    React.createElement('aside', {
      className: `app-sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`,
      'aria-label': 'Main Navigation'
    },
      /* Header & Brand Logo */
      React.createElement('div', {
        style: {
          height: 'var(--header-height)', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'linear-gradient(90deg, rgba(2,132,199,0.06), transparent)'
        }
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' } },
          React.createElement('div', {
            style: {
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-600))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0,
              boxShadow: '0 10px 24px -12px rgba(2,132,199,0.6)'
            }
          }, React.createElement(SparklesIcon, { size: 18 })),
          !isCollapsed && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
            React.createElement('span', {
              className: 'font-title', style: { letterSpacing: '-0.02em', whiteSpace: 'nowrap', fontSize: '0.98rem' }
            }, 'InsightIQ '),
            React.createElement('span', { style: { color: 'var(--color-primary-500)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' } }, 'Enterprise AI')
          )
        ),
        React.createElement('button', {
          className: 'btn btn-ghost btn-sm',
          onClick: onToggle,
          'aria-label': isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar',
          style: { padding: 6, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }
        }, React.createElement(SidebarIcon, { size: 18 }))
      ),

      /* Nav Body */
      React.createElement('div', { style: { flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' } },

        /* Section 1: Core Platform */
        React.createElement('div', null,
          !isCollapsed && React.createElement('div', {
            className: 'font-caption',
            style: { color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px 8px 8px', fontWeight: 600 }
          }, 'Core'),
          mainNavItems.map((item) => {
            const isActive = activeNav === item.id;
            const content = React.createElement('button', {
              key: item.id,
              onClick: () => onSelectNav && onSelectNav(item.id),
              className: 'font-button',
              style: {
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '10px' : '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid transparent',
                backgroundColor: isActive ? 'var(--bg-surface-active)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                marginBottom: 2,
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(2,132,199,0.12)' : 'none'
              }
            },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                React.createElement(item.icon, { size: 18, color: isActive ? 'var(--color-primary-500)' : 'currentColor' }),
                !isCollapsed && React.createElement('span', null, item.label)
              ),
              !isCollapsed && item.badge && React.createElement('span', { className: 'badge' }, item.badge)
            );

            return isCollapsed
              ? React.createElement(Tooltip, { key: item.id, content: item.label, position: 'right' }, content)
              : content;
          })
        ),

        /* Section 2: AI */
        React.createElement('div', null,
          !isCollapsed && React.createElement('div', {
            className: 'font-caption',
            style: { color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px 8px 8px', fontWeight: 600 }
          }, 'AI'),
          aiNavItems.map((item) => {
            const isActive = activeNav === item.id;
            const content = React.createElement('button', {
              key: item.id,
              onClick: () => onSelectNav && onSelectNav(item.id),
              className: 'font-button',
              style: {
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '10px' : '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid transparent',
                backgroundColor: isActive ? 'var(--bg-surface-active)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                marginBottom: 2,
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(2,132,199,0.12)' : 'none'
              }
            },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                React.createElement(item.icon, { size: 18, color: isActive ? 'var(--color-primary-500)' : 'currentColor' }),
                !isCollapsed && React.createElement('span', null, item.label)
              ),
              !isCollapsed && item.badge && React.createElement('span', { className: 'badge' }, item.badge)
            );

            return isCollapsed
              ? React.createElement(Tooltip, { key: item.id, content: item.label, position: 'right' }, content)
              : content;
          })
        ),

        /* Section 3: Account */
        React.createElement('div', null,
          !isCollapsed && React.createElement('div', {
            className: 'font-caption',
            style: { color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px 8px 8px', fontWeight: 600 }
          }, 'Account'),
          accountNavItems.map((item) => {
            const isActive = activeNav === item.id;
            const content = React.createElement('button', {
              key: item.id,
              onClick: () => onSelectNav && onSelectNav(item.id),
              className: 'font-button',
              style: {
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '10px' : '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid transparent',
                backgroundColor: isActive ? 'var(--bg-surface-active)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                marginBottom: 2,
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(2,132,199,0.12)' : 'none'
              }
            },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                React.createElement(item.icon, { size: 18 }),
                !isCollapsed && React.createElement('span', null, item.label)
              ),
              !isCollapsed && item.badge && React.createElement('span', { className: 'badge' }, item.badge)
            );

            return isCollapsed
              ? React.createElement(Tooltip, { key: item.id, content: item.label, position: 'right' }, content)
              : content;
          })
        )
      ),

      /* Footer / Workspace Plan Badge */
      !isCollapsed && React.createElement('div', {
        style: { padding: 16, borderTop: '1px solid var(--border-subtle)' }
      },
        React.createElement('div', {
          style: {
            padding: 12, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }
        },
          React.createElement('div', null,
            React.createElement('div', { className: 'font-caption', style: { fontWeight: 600 } }, 'Enterprise Plan'),
            React.createElement('div', { className: 'font-caption', style: { color: 'var(--text-tertiary)' } }, 'US-East Production')
          ),
          React.createElement(ChevronRightIcon, { size: 16, color: 'var(--text-tertiary)' })
        )
      )
    )
  );
};