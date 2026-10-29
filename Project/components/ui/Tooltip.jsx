import React, { useState } from 'https://esm.sh/react@18.2.0';

export const Tooltip = ({ content, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionStyles = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 8 },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 }
  };

  return (
    React.createElement('div', {
      style: { position: 'relative', display: 'inline-block' },
      onMouseEnter: () => setIsVisible(true),
      onMouseLeave: () => setIsVisible(false),
      onFocus: () => setIsVisible(true),
      onBlur: () => setIsVisible(false)
    },
      children,
      isVisible && React.createElement('div', {
        role: 'tooltip',
        className: 'font-caption animate-fade-in',
        style: {
          position: 'absolute',
          backgroundColor: 'var(--color-neutral-900)',
          color: 'var(--color-neutral-0)',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          whiteSpace: 'nowrap',
          zIndex: 70,
          pointerEvents: 'none',
          boxShadow: 'var(--shadow-sm)',
          ...positionStyles[position]
        }
      }, content)
    )
  );
};

export const Popover = ({ trigger, children, isOpen = false, onToggle }) => (
  React.createElement('div', { style: { position: 'relative', display: 'inline-block' } },
    React.createElement('div', { onClick: onToggle }, trigger),
    isOpen && React.createElement('div', {
      className: 'animate-fade-in',
      style: {
        position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 60,
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 16, minWidth: 220
      }
    }, children)
  )
);
