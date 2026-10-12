import React from 'https://esm.sh/react@18.2.0';
import { Card } from '../ui/Cards.jsx';
import { DownloadIcon, RefreshCwIcon } from '../../assets/icons/icons.js';

export const ChartContainer = ({
  title,
  subtitle,
  children,
  badge = null,
  height = 260
}) => (
  React.createElement(Card, { style: { padding: 20 } },
    /* Header & Controls */
    React.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16
      }
    },
      React.createElement('div', null,
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('h3', { className: 'font-title' }, title),
          badge && React.createElement('span', { className: 'badge' }, badge)
        ),
        subtitle && React.createElement('p', { className: 'font-caption', style: { color: 'var(--text-secondary)', marginTop: 2 } }, subtitle)
      ),
      React.createElement('div', { style: { display: 'flex', gap: 6 } },
        React.createElement('button', { className: 'btn btn-ghost btn-sm', style: { padding: 4 } }, React.createElement(RefreshCwIcon, { size: 14 })),
        React.createElement('button', { className: 'btn btn-ghost btn-sm', style: { padding: 4 } }, React.createElement(DownloadIcon, { size: 14 }))
      )
    ),

    /* SVG Chart Drawing Canvas Container */
    React.createElement('div', {
      style: { width: '100%', height, position: 'relative', overflow: 'hidden' }
    }, children)
  )
);
