import React from 'https://esm.sh/react@18.2.0';

export const SpinnerIcon = ({ size = 20, color = 'currentColor', className = '' }) => (
  React.createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: '2.5',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: `animate-spin ${className}`
  },
    React.createElement('path', { d: 'M21 12a9 9 0 11-6.219-8.56' })
  )
);

export const Spinner = ({ size = 24, label = 'Loading...' }) => (
  React.createElement('div', {
    className: 'flex items-center gap-2 text-tertiary font-caption',
    role: 'status'
  },
    React.createElement(SpinnerIcon, { size }),
    React.createElement('span', { className: 'sr-only' }, label)
  )
);
