import React from 'https://esm.sh/react@18.2.0';
import { ChevronDownIcon, CalendarIcon } from '../../assets/icons/icons.js';

export const Select = ({
  label,
  options = [],
  value,
  onChange,
  isDisabled = false,
  helperText,
  errorText,
  className = ''
}) => {
  return (
    React.createElement('div', { className: `input-wrapper ${className}` },
      label && React.createElement('label', { className: 'input-label' }, label),
      React.createElement('div', { style: { position: 'relative' } },
        React.createElement('select', {
          value,
          onChange,
          disabled: isDisabled,
          className: 'input-field',
          style: { appearance: 'none', paddingRight: 32 }
        },
          options.map((opt, i) => React.createElement('option', { key: i, value: opt.value }, opt.label))
        ),
        React.createElement('div', {
          style: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }
        }, React.createElement(ChevronDownIcon, { size: 16 }))
      ),
      errorText ? React.createElement('span', { className: 'input-error-msg' }, errorText) : helperText && React.createElement('span', { className: 'input-helper' }, helperText)
    )
  );
};

export const Checkbox = ({ label, checked = false, onChange, isDisabled = false, id }) => (
  React.createElement('label', {
    htmlFor: id,
    style: { display: 'inline-flex', alignItems: 'center', gap: 8, cursor: isDisabled ? 'not-allowed' : 'pointer', userSelect: 'none' }
  },
    React.createElement('input', {
      type: 'checkbox',
      id,
      checked,
      onChange,
      disabled: isDisabled,
      style: { width: 16, height: 16, accentColor: 'var(--color-primary-500)', cursor: isDisabled ? 'not-allowed' : 'pointer' }
    }),
    React.createElement('span', { className: 'font-body', style: { color: isDisabled ? 'var(--text-tertiary)' : 'var(--text-primary)' } }, label)
  )
);

export const Radio = ({ label, checked = false, onChange, name, id, isDisabled = false }) => (
  React.createElement('label', {
    htmlFor: id,
    style: { display: 'inline-flex', alignItems: 'center', gap: 8, cursor: isDisabled ? 'not-allowed' : 'pointer', userSelect: 'none' }
  },
    React.createElement('input', {
      type: 'radio',
      id,
      name,
      checked,
      onChange,
      disabled: isDisabled,
      style: { width: 16, height: 16, accentColor: 'var(--color-primary-500)', cursor: isDisabled ? 'not-allowed' : 'pointer' }
    }),
    React.createElement('span', { className: 'font-body', style: { color: isDisabled ? 'var(--text-tertiary)' : 'var(--text-primary)' } }, label)
  )
);

export const Toggle = ({ label, checked = false, onChange, isDisabled = false }) => (
  React.createElement('label', {
    style: { display: 'inline-flex', alignItems: 'center', gap: 12, cursor: isDisabled ? 'not-allowed' : 'pointer', userSelect: 'none' }
  },
    React.createElement('div', {
      onClick: () => !isDisabled && onChange && onChange(!checked),
      style: {
        width: 38,
        height: 22,
        borderRadius: 12,
        backgroundColor: checked ? 'var(--color-primary-500)' : 'var(--color-neutral-300)',
        position: 'relative',
        transition: 'background-color 200ms ease',
        opacity: isDisabled ? 0.5 : 1
      }
    },
      React.createElement('div', {
        style: {
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          position: 'absolute',
          top: 3,
          left: checked ? 19 : 3,
          transition: 'left 200ms cubic-bezier(0.16, 1, 0.3, 1)'
        }
      })
    ),
    label && React.createElement('span', { className: 'font-body', style: { color: isDisabled ? 'var(--text-tertiary)' : 'var(--text-primary)' } }, label)
  )
);

export const DatePicker = ({ label, value, onChange, helperText }) => (
  React.createElement('div', { className: 'input-wrapper' },
    label && React.createElement('label', { className: 'input-label' }, label),
    React.createElement('div', { style: { position: 'relative' } },
      React.createElement('input', {
        type: 'date',
        value,
        onChange,
        className: 'input-field',
        style: { paddingRight: 36 }
      }),
      React.createElement('div', {
        style: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }
      }, React.createElement(CalendarIcon, { size: 16 }))
    ),
    helperText && React.createElement('span', { className: 'input-helper' }, helperText)
  )
);
