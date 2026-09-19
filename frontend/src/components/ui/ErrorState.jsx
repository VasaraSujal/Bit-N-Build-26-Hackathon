import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export const ErrorState = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section.',
  onRetry,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-surface border border-danger-border rounded-panel max-w-lg mx-auto ${className}`}>
      <div className="w-10 h-10 rounded-full bg-danger-subtle border border-danger-border flex items-center justify-center text-danger mb-3 shrink-0">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm sm:text-base font-semibold text-content-primary mb-1">{title}</h4>
      <p className="text-xs sm:text-sm text-content-secondary max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
