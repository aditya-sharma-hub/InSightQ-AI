import React, { useEffect } from 'https://esm.sh/react@18.2.0';
import { XIcon } from '../../assets/icons/icons.js';
import { Button } from './Button.jsx';

export const Dialog = ({
  isOpen = false,
  onClose,
  title,
  subtitle,
  children,
  primaryActionText = 'Confirm',
  onPrimaryAction,
  secondaryActionText = 'Cancel',
  isPrimaryDanger = false
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    React.createElement('div', {
      className: 'modal-overlay animate-fade-in',
      role: 'dialog',
      'aria-modal': 'true',
      onClick: (e) => e.target === e.currentTarget && onClose && onClose()
    },
      React.createElement('div', { className: 'modal-content animate-slide-up' },
        React.createElement('div', {
          style: {
            padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'
          }
        },
          React.createElement('div', null,
            React.createElement('h3', { className: 'font-title' }, title),
            subtitle && React.createElement('p', { className: 'font-caption', style: { color: 'var(--text-secondary)', marginTop: 4 } }, subtitle)
          ),
          React.createElement('button', {
            className: 'btn btn-ghost btn-sm',
            onClick: onClose,
            'aria-label': 'Close modal'
          }, React.createElement(XIcon, { size: 18 }))
        ),
        React.createElement('div', { style: { padding: 24, flex: 1, overflowY: 'auto' } }, children),
        React.createElement('div', {
          style: {
            padding: '16px 24px', borderTop: '1px solid var(--border-subtle)',
            display: 'flex', justifyContent: 'flex-end', gap: 12, backgroundColor: 'var(--bg-subtle)'
          }
        },
          secondaryActionText && React.createElement(Button, { variant: 'secondary', onClick: onClose }, secondaryActionText),
          primaryActionText && React.createElement(Button, {
            variant: isPrimaryDanger ? 'danger' : 'primary',
            onClick: onPrimaryAction || onClose
          }, primaryActionText)
        )
      )
    )
  );
};
