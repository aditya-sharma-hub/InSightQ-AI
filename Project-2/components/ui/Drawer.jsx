import React from 'https://esm.sh/react@18.2.0';
import { XIcon } from '../../assets/icons/icons.js';

export const Drawer = ({ isOpen = false, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    React.createElement('div', {
      className: 'modal-overlay animate-fade-in',
      onClick: (e) => e.target === e.currentTarget && onClose && onClose()
    },
      React.createElement('div', { className: 'drawer-panel animate-slide-right' },
        React.createElement('div', {
          style: {
            padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }
        },
          React.createElement('h3', { className: 'font-title' }, title),
          React.createElement('button', {
            className: 'btn btn-ghost btn-sm',
            onClick: onClose,
            'aria-label': 'Close drawer'
          }, React.createElement(XIcon, { size: 18 }))
        ),
        React.createElement('div', { style: { padding: 24, flex: 1, overflowY: 'auto' } }, children)
      )
    )
  );
};
