import React, { useState } from 'https://esm.sh/react@18.2.0';
import { ChevronDownIcon } from '../../assets/icons/icons.js';

export const Tabs = ({ tabs = [], activeTab, onChange, variant = 'line' }) => (
  React.createElement('div', {
    role: 'tablist',
    style: {
      display: 'flex', gap: variant === 'pill' ? 4 : 24,
      borderBottom: variant === 'line' ? '1px solid var(--border-subtle)' : 'none',
      padding: variant === 'pill' ? 4 : 0,
      backgroundColor: variant === 'pill' ? 'var(--bg-subtle)' : 'transparent',
      borderRadius: variant === 'pill' ? 'var(--radius-lg)' : 0
    }
  },
    tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      return React.createElement('button', {
        key: tab.id,
        role: 'tab',
        'aria-selected': isActive,
        onClick: () => onChange && onChange(tab.id),
        className: 'font-button',
        style: {
          padding: variant === 'pill' ? '6px 14px' : '12px 4px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          borderRadius: variant === 'pill' ? 'var(--radius-md)' : 0,
          backgroundColor: variant === 'pill' && isActive ? 'var(--bg-surface)' : 'transparent',
          color: isActive ? 'var(--color-primary-600)' : 'var(--text-secondary)',
          borderBottom: variant === 'line' && isActive ? '2px solid var(--color-primary-500)' : 'none',
          boxShadow: variant === 'pill' && isActive ? 'var(--shadow-xs)' : 'none',
          transition: 'all var(--transition-fast)'
        }
      }, tab.label);
    })
  )
);

export const Accordion = ({ items = [] }) => {
  const [openIndices, setOpenIndices] = useState([0]);

  const toggle = (index) => {
    setOpenIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    React.createElement('div', null,
      items.map((item, idx) => {
        const isOpen = openIndices.includes(idx);
        return React.createElement('div', { key: idx, className: 'accordion-item' },
          React.createElement('button', {
            className: 'accordion-header',
            onClick: () => toggle(idx),
            'aria-expanded': isOpen
          },
            item.title,
            React.createElement(ChevronDownIcon, {
              size: 18,
              style: { transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }
            })
          ),
          isOpen && React.createElement('div', { className: 'accordion-body animate-fade-in' }, item.content)
        );
      })
    )
  );
};
