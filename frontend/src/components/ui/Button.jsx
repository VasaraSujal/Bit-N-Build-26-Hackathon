import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Button component
 * @param {Object} props
 * @param {'primary'|'secondary'|'danger'|'ghost'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.isLoading=false]
 * @param {boolean} [props.disabled=false]
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export const Button = React.forwardRef(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  children,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none min-w-0';

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-base gap-2.5'
  };

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary shadow-subtle',
    secondary: 'bg-white text-content-primary border border-border hover:bg-surface-muted focus:ring-gray-300 shadow-subtle',
    danger: 'bg-danger text-white hover:bg-red-700 focus:ring-danger shadow-subtle',
    ghost: 'bg-transparent text-content-secondary hover:text-content-primary hover:bg-surface-muted focus:ring-gray-300'
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : icon ? (
        <span className="shrink-0 flex items-center">{icon}</span>
      ) : null}
      <span className="truncate">{children}</span>
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
