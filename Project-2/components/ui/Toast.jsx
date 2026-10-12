import React, { useEffect } from 'https://esm.sh/react@18.2.0';
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon, XIcon } from '../../assets/icons/icons.js';

export const Toast = ({ id, type = 'info', title, message, onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: CheckCircleIcon,
    warning: AlertTriangleIcon,
    error: AlertTriangleIcon,
    info: InfoIcon
  };

  const colors = {
    success: 'var(--color-success-500)',
    warning: 'var(--color-warning-500)',
    error: 'var(--color-error-500)',
    info: 'var(--color-primary-500)'
  };

  const Icon = icons[type] || InfoIcon;

  return (
    React.createElement('div', {
      className: 'animate-slide-up',
      style: {
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', minWidth: 320, maxWidth: 420
      }
    },
      React.createElement(Icon, { size: 20, color: colors[type], style: { marginTop: 2 } }),
      React.createElement('div', { style: { flex: 1 } },
        title && React.createElement('h4', { className: 'font-button', style: { marginBottom: 2 } }, title),
        message && React.createElement('p', { className: 'font-caption', style: { color: 'var(--text-secondary)' } }, message)
      ),
      onClose && React.createElement('button', {
        onClick: onClose,
        className: 'btn btn-ghost btn-sm',
        style: { padding: 4, margin: -4 }
      }, React.createElement(XIcon, { size: 14 }))
    )
  );
};

export const ToastContainer = ({ toasts = [], removeToast }) => (
  React.createElement('div', {
    style: {
      position: 'fixed', bottom: 24, right: 24, zIndex: 60,
      display: 'flex', flexDirection: 'column', gap: 12
    }
  },
    toasts.map((toast) => React.createElement(Toast, {
      key: toast.id,
      ...toast,
      onClose: () => removeToast && removeToast(toast.id)
    }))
  )
);
