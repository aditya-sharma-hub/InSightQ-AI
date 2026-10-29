import React from 'https://esm.sh/react@18.2.0';
import { Button } from './Button.jsx';
import { PlusIcon } from '../../assets/icons/icons.js';
import { NoDatasetsIllustration, NoReportsIllustration, NoModelsIllustration, NoNotificationsIllustration } from '../../assets/illustrations/illustrations.js';

export const EmptyState = ({
  illustration: Illustration = NoDatasetsIllustration,
  title = 'No Data Available',
  description = 'Get started by creating or connecting your first item.',
  actionText = 'Create Item',
  onAction
}) => (
  React.createElement('div', {
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', textAlign: 'center', background: 'var(--bg-surface-elevated)',
      border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)'
    }
  },
    Illustration && React.createElement(Illustration, { width: 140, height: 100 }),
    React.createElement('h3', { className: 'font-title', style: { marginTop: 16, marginBottom: 6 } }, title),
    React.createElement('p', { className: 'font-body', style: { color: 'var(--text-secondary)', maxWidth: 360, marginBottom: 20 } }, description),
    actionText && React.createElement(Button, { icon: PlusIcon, onClick: onAction }, actionText)
  )
);

export const LoadingSkeleton = ({ width = '100%', height = 20, borderRadius = 'var(--radius-sm)' }) => (
  React.createElement('div', {
    className: 'skeleton animate-skeleton',
    style: { width, height, borderRadius }
  })
);

export const ProgressBar = ({ progress = 45, label = null, showPercentage = true }) => (
  React.createElement('div', { style: { width: '100%' } },
    (label || showPercentage) && React.createElement('div', {
      style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }
    },
      label && React.createElement('span', null, label),
      showPercentage && React.createElement('span', { className: 'font-mono' }, `${progress}%`)
    ),
    React.createElement('div', {
      style: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'var(--bg-subtle)', overflow: 'hidden' }
    },
      React.createElement('div', {
        style: {
          width: `${progress}%`, height: '100%', backgroundColor: 'var(--color-primary-500)',
          borderRadius: 4, transition: 'width 300ms ease'
        }
      })
    )
  )
);
