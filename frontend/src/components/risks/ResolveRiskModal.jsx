import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const ResolveRiskModal = ({
  isOpen,
  onClose,
  eventId,
  risk,
  onSuccess
}) => {
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!risk) return null;

  const isCurrentlyOpen = risk.status === 'open';
  const actionText = isCurrentlyOpen ? 'Resolve' : 'Reopen';
  const endpoint = isCurrentlyOpen
    ? `events/${eventId}/risks/${risk.id}/resolve`
    : `events/${eventId}/risks/${risk.id}/reopen`;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.patch(endpoint, {});
      success(res.message || `Risk ${actionText.toLowerCase()}d successfully.`);
      onSuccess?.(res.data?.risk);
      onClose();
    } catch (err) {
      toastError(err.message || `Failed to ${actionText.toLowerCase()} risk.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${actionText} this risk?`}
      description={
        isCurrentlyOpen
          ? 'The risk will remain in the event audit history as resolved.'
          : 'The risk will be reopened and returned to active operational monitoring.'
      }
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
            variant={isCurrentlyOpen ? 'primary' : 'secondary'}
            size="sm"
            onClick={handleConfirm}
            isLoading={isSubmitting}
          >
            {actionText} Risk
          </Button>
        </>
      }
    >
      <div className="text-xs sm:text-sm text-content-secondary space-y-2">
        <p>
          Risk Description: <strong className="text-content-primary">{risk.description}</strong>
        </p>
        <p>
          Current Status:{' '}
          <span className={`font-semibold ${isCurrentlyOpen ? 'text-danger' : 'text-success'}`}>
            {isCurrentlyOpen ? 'Open' : 'Resolved'}
          </span>
        </p>
      </div>
    </Modal>
  );
};

export default ResolveRiskModal;
