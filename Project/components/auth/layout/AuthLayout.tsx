import React from 'https://esm.sh/react@18.2.0';
import { SparklesIcon } from '../../../assets/icons/icons.js';

export const AuthHeader = ({ title = 'Welcome back', subtitle = 'Sign in to continue to your AI workspace.' }) => (
  React.createElement('div', { className: 'auth-header-block' },
    React.createElement('div', { className: 'auth-logo-badge' },
      React.createElement(SparklesIcon, { size: 24 })
    ),
    React.createElement('h1', { className: 'font-title', style: { fontSize: '1.25rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 } }, 'InsightIQ AI'),
    React.createElement('h2', { className: 'auth-card-title' }, title),
    subtitle && React.createElement('p', { className: 'auth-card-subtitle' }, subtitle)
  )
);

export const AuthLayout = ({ children }) => (
  React.createElement('div', { className: 'auth-mesh-viewport' },
    React.createElement('div', { className: 'auth-mesh-bg' }),
    React.createElement('div', { className: 'auth-particles-layer' },
      React.createElement('div', { className: 'ambient-particle ambient-particle-1' }),
      React.createElement('div', { className: 'ambient-particle ambient-particle-2' }),
      React.createElement('div', { className: 'ambient-particle ambient-particle-3' })
    ),
    children
  )
);
