import React from 'react';

/**
 * Reusable Select component
 */
export const Select = React.forwardRef(({
  id,
  label,
  helperText,
  error,
  options = [],
  disabled = false,
  required = false,
  children,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const generatedId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`flex flex-col gap-1.5 w-full min-w-0 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={generatedId}
          className="text-xs font-semibold text-content-primary flex items-center gap-1"
        >
          {label}
          {required && <span className="text-danger" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={generatedId}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${generatedId}-error` : helperText ? `${generatedId}-helper` : undefined}
          className={`w-full px-3 py-2 text-sm text-content-primary bg-white border rounded-lg appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-surface-muted disabled:text-content-muted disabled:cursor-not-allowed pr-8 ${
            error
              ? 'border-danger focus:border-danger focus:ring-red-100'
              : 'border-border hover:border-border-dark focus:border-primary focus:ring-blue-100'
          } ${className}`}
          {...props}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-content-muted">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {error ? (
        <p id={`${generatedId}-error`} className="text-xs text-danger font-medium">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${generatedId}-helper`} className="text-xs text-content-secondary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
