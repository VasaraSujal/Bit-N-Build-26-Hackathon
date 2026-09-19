import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const RemoveVolunteerModal = ({
  isOpen,
  onClose,
  eventId,
  volunteer,
  onSuccess
}) => {
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!volunteer) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.delete(`events/${eventId}/volunteers/${volunteer.id}`);
      success(res.message || 'Volunteer removed from event successfully.');
      onSuccess?.();
      onClose();
    } catch (err) {
      toastError(err.message || 'Failed to remove volunteer from event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Remove "${volunteer.name}"?`}
      description="Their event volunteer assignment and responsibility will be unassigned. Associated historical data remains preserved."
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
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            isLoading={isSubmitting}
          >
            Remove Volunteer
          </Button>
        </>
      }
    >
      <div className="text-xs sm:text-sm text-content-secondary space-y-2">
        <p>
          Volunteer: <strong className="text-content-primary">{volunteer.name}</strong> ({volunteer.email})
        </p>
        <p>
          Assigned Responsibility: <span className="font-semibold text-content-primary">{volunteer.responsibility}</span>
        </p>
        <p className="text-danger-text pt-1">
          Are you sure you want to remove this volunteer from the event?
        </p>
      </div>
    </Modal>
  );
};

export default RemoveVolunteerModal;
