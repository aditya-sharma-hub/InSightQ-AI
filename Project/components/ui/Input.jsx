import React from 'https://esm.sh/react@18.2.0';
import { SearchIcon } from '../../assets/icons/icons.js';

export const Input = ({
  label,
  helperText,
  errorText,
  successText,
  isRequired = false,
  isDisabled = false,
  icon: Icon = null,
  shortcut = null,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  className = '',
  ...props
}) => {
  return (
    React.createElement('div', { className: `input-wrapper ${className}` },
      label && React.createElement('label', { className: 'input-label' },
        React.createElement('span', null, label, isRequired && React.createElement('span', { style: { color: 'var(--color-error-500)', marginLeft: 4 } }, '*')),
        shortcut && React.createElement('span', { className: 'badge' }, shortcut)
      ),
      React.createElement('div', { style: { position: 'relative', width: '100%' } },
        Icon && React.createElement('div', {
          style: {
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', pointerEvents: 'none'
          }
        }, React.createElement(Icon, { size: 16 })),
        React.createElement('input', {
          type,
          value,
          onChange,
          placeholder,
          disabled: isDisabled,
          className: `input-field ${errorText ? 'input-error' : ''}`,
          style: {
            paddingLeft: Icon ? 36 : 12,
            borderColor: errorText ? 'var(--color-error-500)' : successText ? 'var(--color-success-500)' : undefined
          },
          ...props
        })
      ),
      errorText && React.createElement('span', { className: 'input-error-msg' }, errorText),
      successText && React.createElement('span', { className: 'input-success-msg' }, successText),
      helperText && !errorText && !successText && React.createElement('span', { className: 'input-helper' }, helperText)
    )
  );
};

export const SearchInput = (props) => (
  React.createElement(Input, {
    icon: SearchIcon,
    placeholder: 'Search datasets, reports, models... (Ctrl + K)',
    shortcut: '⌘K',
    ...props
  })
);
