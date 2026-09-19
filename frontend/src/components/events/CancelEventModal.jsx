import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const CancelEventModal = ({ isOpen, onClose, event, onSuccess }) => {
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!event) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.patch(`events/${event.id}/cancel`, {});
      success(res.message || 'Event cancelled successfully.');
      onSuccess?.(res.data?.event);
      onClose();
    } catch (err) {
      toastError(err.message || 'Failed to cancel event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cancel "${event.name}"?`}
      description="This will mark the event as cancelled. Associated records will remain preserved for audit."
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Keep Event
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            isLoading={isSubmitting}
          >
            Cancel Event
          </Button>
        </>
      }
    >
      <div className="text-xs sm:text-sm text-content-secondary space-y-2">
        <p>
          Event Name: <strong className="text-content-primary">{event.name}</strong>
        </p>
        <p className="text-danger-text">
          Are you sure you want to cancel this event?
        </p>
      </div>
    </Modal>
  );
};

export default CancelEventModal;
