import React from 'https://esm.sh/react@18.2.0';
import { Breadcrumb } from '../ui/Badge.jsx';

export const PageTemplate = ({
  title,
  subtitle,
  breadcrumbs = [],
  toolbarActions = null,
  children
}) => (
  React.createElement('div', { className: 'animate-fade-in' },
    /* Header Section */
    React.createElement('div', {
      style: {
        marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8
      }
    },
      breadcrumbs.length > 0 && React.createElement(Breadcrumb, { items: breadcrumbs }),
      React.createElement('div', {
        style: {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
          padding: '18px 20px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface-elevated)', boxShadow: 'var(--shadow-xs)'
        }
      },
        React.createElement('div', null,
          React.createElement('h1', { className: 'font-heading', style: { letterSpacing: '-0.02em' } }, title),
          subtitle && React.createElement('p', { className: 'font-body', style: { color: 'var(--text-secondary)', marginTop: 4 } }, subtitle)
        ),
        toolbarActions && React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } }, toolbarActions)
      )
    ),

    /* Main Body Content */
    React.createElement('div', null, children)
  )
);

export const ContentGrid = ({ children, className = '' }) => (
  React.createElement('div', { className: `grid-12 ${className}` }, children)
);

export const Footer = () => (
  React.createElement('footer', { className: 'app-footer' },
    React.createElement('div', null, 'InsightIQ AI Platform © 2026 Enterprise Edition'),
    React.createElement('div', { style: { display: 'flex', gap: 16 } },
      React.createElement('span', null, 'Status: Operational'),
      React.createElement('span', null, 'v2.4.0-release')
    )
  )
);
