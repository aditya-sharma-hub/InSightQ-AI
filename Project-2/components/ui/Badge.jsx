import React from 'https://esm.sh/react@18.2.0';
import { ChevronRightIcon, ChevronLeftIcon } from '../../assets/icons/icons.js';

export const Badge = ({ children, variant = 'primary' }) => (
  React.createElement('span', { className: 'badge' }, children)
);

export const StatusChip = ({ status = 'active', label }) => {
  const typeMap = {
    active: 'status-chip-success',
    pending: 'status-chip-warning',
    failed: 'status-chip-error',
    inactive: 'status-chip-neutral'
  };

  const dots = {
    active: 'var(--color-success-500)',
    pending: 'var(--color-warning-500)',
    failed: 'var(--color-error-500)',
    inactive: 'var(--color-neutral-400)'
  };

  return (
    React.createElement('span', { className: `status-chip ${typeMap[status] || typeMap.inactive}` },
      React.createElement('span', {
        style: { width: 6, height: 6, borderRadius: '50%', backgroundColor: dots[status] || dots.inactive }
      }),
      label || status.charAt(0).toUpperCase() + status.slice(1)
    )
  );
};

export const Avatar = ({ name = 'User', src = null, size = 32 }) => {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return (
    React.createElement('div', {
      style: {
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(2,132,199,0.16), rgba(79,70,229,0.16))', color: 'var(--text-brand)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 600, fontSize: size * 0.4, border: '1px solid var(--border-subtle)',
        overflow: 'hidden', flexShrink: 0
      }
    },
      src ? React.createElement('img', { src, alt: name, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : initials
    )
  );
};

export const Breadcrumb = ({ items = [] }) => (
  React.createElement('nav', { 'aria-label': 'Breadcrumb', style: { display: 'flex', alignItems: 'center', gap: 6 } },
    items.map((item, idx) => React.createElement(React.Fragment, { key: idx },
      idx > 0 && React.createElement(ChevronRightIcon, { size: 14, color: 'var(--text-tertiary)' }),
      React.createElement('span', {
        className: 'font-caption',
        style: {
          color: idx === items.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontWeight: idx === items.length - 1 ? 600 : 400
        }
      }, item.label)
    ))
  )
);

export const Pagination = ({ currentPage = 1, totalPages = 10, onPageChange }) => (
  React.createElement('div', {
    style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }
  },
    React.createElement('span', { className: 'font-caption', style: { color: 'var(--text-secondary)' } },
      `Page ${currentPage} of ${totalPages}`
    ),
    React.createElement('div', { style: { display: 'flex', gap: 8 } },
      React.createElement('button', {
        className: 'btn btn-secondary btn-sm',
        disabled: currentPage === 1,
        onClick: () => onPageChange && onPageChange(currentPage - 1)
      }, React.createElement(ChevronLeftIcon, { size: 14 }), 'Previous'),
      React.createElement('button', {
        className: 'btn btn-secondary btn-sm',
        disabled: currentPage === totalPages,
        onClick: () => onPageChange && onPageChange(currentPage + 1)
      }, 'Next', React.createElement(ChevronRightIcon, { size: 14 }))
    )
  )
);
