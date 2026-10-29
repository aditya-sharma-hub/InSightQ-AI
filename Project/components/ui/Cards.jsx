import React from 'https://esm.sh/react@18.2.0';
import { TrendingUpIcon } from '../../assets/icons/icons.js';

export const Card = ({ children, className = '', style = {}, onClick }) => (
  React.createElement('div', {
    className: `card ${className}`,
    style: { boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-surface)', ...style },
    onClick
  }, children)
);

export const StatisticCard = ({ title, value, change, trend = 'up', icon: Icon, description }) => {
  const isPositive = trend === 'up';
  return (
    React.createElement(Card, { className: 'interactive-hover' },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
        React.createElement('span', { className: 'font-subtitle', style: { color: 'var(--text-secondary)' } }, title),
        Icon && React.createElement('div', {
          style: {
            width: 36, height: 36, borderRadius: 8, backgroundColor: 'var(--color-primary-50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-600)'
          }
        }, React.createElement(Icon, { size: 18 }))
      ),
      React.createElement('div', { className: 'font-display', style: { marginBottom: 8 } }, value),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        change && React.createElement('span', {
          className: 'status-chip ' + (isPositive ? 'status-chip-success' : 'status-chip-error')
        },
          React.createElement(TrendingUpIcon, { size: 12, style: { transform: isPositive ? 'none' : 'rotate(180deg)' } }),
          change
        ),
        description && React.createElement('span', { className: 'font-caption', style: { color: 'var(--text-tertiary)' } }, description)
      )
    )
  );
};

export const MetricCard = ({ label, metric, subtitle, badge }) => (
  React.createElement(Card, null,
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
      React.createElement('span', { className: 'font-caption', style: { color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, label),
      badge && React.createElement('span', { className: 'badge' }, badge)
    ),
    React.createElement('div', { className: 'font-title', style: { color: 'var(--text-primary)', marginBottom: 4 } }, metric),
    subtitle && React.createElement('div', { className: 'font-caption', style: { color: 'var(--text-secondary)' } }, subtitle)
  )
);

export const FeatureCard = ({ title, description, icon: Icon, actionText, onAction }) => (
  React.createElement(Card, { className: 'interactive-hover' },
    Icon && React.createElement('div', {
      style: {
        width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, rgba(2,132,199,0.16), rgba(79,70,229,0.16))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-brand)', marginBottom: 16
      }
    }, React.createElement(Icon, { size: 22 })),
    React.createElement('h3', { className: 'font-title', style: { marginBottom: 8 } }, title),
    React.createElement('p', { className: 'font-body', style: { color: 'var(--text-secondary)', marginBottom: 16 } }, description),
    actionText && React.createElement('button', {
      className: 'btn btn-ghost btn-sm',
      onClick: onAction,
      style: { paddingLeft: 0, color: 'var(--color-primary-600)' }
    }, actionText, ' →')
  )
);

export const TableCard = ({ title, action, children }) => (
  React.createElement(Card, { style: { padding: 0, overflow: 'hidden' } },
    React.createElement('div', {
      style: {
        padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }
    },
      React.createElement('h3', { className: 'font-title' }, title),
      action && React.createElement('div', null, action)
    ),
    children
  )
);
