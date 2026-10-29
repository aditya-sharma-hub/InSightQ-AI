import React from 'https://esm.sh/react@18.2.0';

export const NoDatasetsIllustration = ({ width = 160, height = 120, className = '' }) => (
  React.createElement('svg', {
    width, height, viewBox: '0 0 160 120', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className
  },
    React.createElement('rect', { x: 30, y: 20, width: 100, height: 80, rx: 12, fill: 'var(--bg-subtle)', stroke: 'var(--border-strong)', strokeWidth: 2, strokeDasharray: '4 4' }),
    React.createElement('path', { d: 'M55 45h50M55 60h35M55 75h45', stroke: 'var(--text-tertiary)', strokeWidth: 3, strokeLinecap: 'round' }),
    React.createElement('circle', { cx: 110, cy: 75, r: 16, fill: 'var(--color-primary-50)', stroke: 'var(--color-primary-500)', strokeWidth: 2 }),
    React.createElement('path', { d: 'M110 67v16M102 75h16', stroke: 'var(--color-primary-500)', strokeWidth: 2, strokeLinecap: 'round' })
  )
);

export const NoReportsIllustration = ({ width = 160, height = 120, className = '' }) => (
  React.createElement('svg', {
    width, height, viewBox: '0 0 160 120', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className
  },
    React.createElement('rect', { x: 35, y: 15, width: 90, height: 90, rx: 8, fill: 'var(--bg-subtle)', stroke: 'var(--border-subtle)', strokeWidth: 2 }),
    React.createElement('path', { d: 'M50 85V60M70 85V45M90 85V65M110 85V35', stroke: 'var(--color-primary-500)', strokeWidth: 4, strokeLinecap: 'round' }),
    React.createElement('line', { x1: 45, y1: 85, x2: 115, y2: 85, stroke: 'var(--text-tertiary)', strokeWidth: 2 })
  )
);

export const NoModelsIllustration = ({ width = 160, height = 120, className = '' }) => (
  React.createElement('svg', {
    width, height, viewBox: '0 0 160 120', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className
  },
    React.createElement('polygon', { points: '80,20 125,45 125,95 80,120 35,95 35,45', fill: 'var(--bg-subtle)', stroke: 'var(--color-secondary-500)', strokeWidth: 2 }),
    React.createElement('line', { x1: 80, y1: 20, x2: 80, y2: 120, stroke: 'var(--color-secondary-500)', strokeWidth: 1.5, strokeDasharray: '3 3' }),
    React.createElement('circle', { cx: 80, cy: 70, r: 12, fill: 'var(--color-secondary-50)', stroke: 'var(--color-secondary-500)', strokeWidth: 2 })
  )
);

export const NoNotificationsIllustration = ({ width = 160, height = 120, className = '' }) => (
  React.createElement('svg', {
    width, height, viewBox: '0 0 160 120', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className
  },
    React.createElement('circle', { cx: 80, cy: 55, r: 32, fill: 'var(--bg-subtle)', stroke: 'var(--border-strong)', strokeWidth: 2 }),
    React.createElement('path', { d: 'M80 40v20M80 72h.01', stroke: 'var(--text-tertiary)', strokeWidth: 3, strokeLinecap: 'round' })
  )
);
