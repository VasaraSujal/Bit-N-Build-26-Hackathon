import React from 'react';

/**
 * Reusable Textarea component with semantic label, helper text, and error states.
 */
export const Textarea = React.forwardRef(({
  id,
  label,
  helperText,
  error,
  disabled = false,
  required = false,
  rows = 4,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const generatedId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

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

      <textarea
        ref={ref}
        id={generatedId}
        rows={rows}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${generatedId}-error` : helperText ? `${generatedId}-helper` : undefined}
        className={`w-full px-3 py-2 text-sm text-content-primary bg-white border rounded-lg transition-colors placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-surface-muted disabled:text-content-muted disabled:cursor-not-allowed resize-y ${
          error
            ? 'border-danger focus:border-danger focus:ring-red-100'
            : 'border-border hover:border-border-dark focus:border-primary focus:ring-blue-100'
        } ${className}`}
        {...props}
      />

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

Textarea.displayName = 'Textarea';

export default Textarea;
