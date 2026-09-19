import React from 'react';

/**
 * Reusable Badge component
 * @param {Object} props
 * @param {'success'|'warning'|'danger'|'info'|'neutral'} [props.variant='neutral']
 * @param {'sm'|'md'} [props.size='md']
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export const Badge = ({
  variant = 'neutral',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full shrink-0 select-none';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5'
  };

  const variantStyles = {
    neutral: 'bg-surface-muted text-content-secondary border border-border',
    info: 'bg-primary-subtle text-primary-dark border border-blue-200',
    success: 'bg-success-subtle text-success-text border border-success-border',
    warning: 'bg-warning-subtle text-warning-text border border-warning-border',
    danger: 'bg-danger-subtle text-danger-text border border-danger-border'
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.neutral} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
};

export default Badge;
