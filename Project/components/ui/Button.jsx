import React from 'https://esm.sh/react@18.2.0';
import { SpinnerIcon } from './Spinner.jsx';

export const Button = ({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg'
  isLoading = false,
  isDisabled = false,
  icon: Icon = null,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const variantClass = `btn-${variant}`;
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';

  return (
    React.createElement('button', {
      type,
      className: `btn ${variantClass} ${sizeClass} ${className}`,
      disabled: isDisabled || isLoading,
      onClick,
      'aria-busy': isLoading,
      ...props
    },
      isLoading && React.createElement(SpinnerIcon, { size: size === 'sm' ? 14 : 18 }),
      !isLoading && Icon && iconPosition === 'left' && React.createElement(Icon, { size: size === 'sm' ? 14 : 18 }),
      children,
      !isLoading && Icon && iconPosition === 'right' && React.createElement(Icon, { size: size === 'sm' ? 14 : 18 })
    )
  );
};
