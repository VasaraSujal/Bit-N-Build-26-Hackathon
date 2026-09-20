import React from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2, PlayCircle, XCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export const SameDayTaskConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  conflictingTasks = [],
  isSubmitting = false
}) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'No deadline';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'todo':
        return <Badge variant="neutral" size="sm">To Do</Badge>;
      case 'in_progress':
        return <Badge variant="info" size="sm">In Progress</Badge>;
      case 'done':
        return <Badge variant="success" size="sm">Done</Badge>;
      case 'blocked':
        return <Badge variant="danger" size="sm">Blocked</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status || 'To Do'}</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Same-Day Task Assignment"
      description="Workload awareness check for assigned volunteer."
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isLoading={isSubmitting}
          >
            Assign Anyway
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Warning Callout */}
        <div className="p-3.5 bg-warning-subtle border border-warning-border rounded-panel flex items-start gap-3 text-warning-text">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm font-medium leading-relaxed">
            This volunteer already has a task assigned on this date. Are you sure you want to assign another task to this volunteer?
          </div>
        </div>

        {/* Existing Conflicting Tasks */}
        {conflictingTasks && conflictingTasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-content-primary">
              {conflictingTasks.length === 1
                ? 'Existing task on this date:'
                : 'Existing tasks on this date:'}
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {conflictingTasks.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className="p-3 bg-surface-muted/60 border border-border rounded-lg space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-content-primary line-clamp-2">
                      {t.description}
                    </p>
                    {getStatusBadge(t.status)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-content-secondary">
                    <Calendar className="w-3.5 h-3.5 text-content-muted" />
                    <span>{formatDate(t.deadline)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SameDayTaskConfirmationModal;
