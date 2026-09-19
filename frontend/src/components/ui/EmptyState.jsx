import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon,
  title = 'No items found',
  description = 'There are no records to display at this time.',
  action,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-surface border border-dashed border-border rounded-panel max-w-lg mx-auto ${className}`}>
      <div className="w-10 h-10 rounded-full bg-surface-muted border border-border flex items-center justify-center text-content-secondary mb-3 shrink-0">
        {icon || <Inbox className="w-5 h-5" />}
      </div>
      <h4 className="text-sm sm:text-base font-semibold text-content-primary mb-1">{title}</h4>
      <p className="text-xs sm:text-sm text-content-secondary max-w-sm mb-4">{description}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};

export default EmptyState;
