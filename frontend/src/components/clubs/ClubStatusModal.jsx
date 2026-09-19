import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const ClubStatusModal = ({ isOpen, onClose, club, onSuccess }) => {
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!club) return null;

  const isCurrentlyActive = Boolean(club.isActive);
  const actionText = isCurrentlyActive ? 'Deactivate' : 'Activate';
  const endpoint = isCurrentlyActive ? `clubs/${club.id}/deactivate` : `clubs/${club.id}/activate`;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.patch(endpoint, {});
      success(res.message || `Club ${actionText.toLowerCase()}d successfully.`);
      onSuccess?.(res.data?.club);
      onClose();
    } catch (err) {
      toastError(err.message || `Failed to ${actionText.toLowerCase()} club.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${actionText} ${club.name}?`}
      description={
        isCurrentlyActive
          ? 'New events cannot be created for an inactive club. Existing events and records will remain accessible.'
          : 'Activating this club will allow new events, volunteer assignments, and club operations to resume.'
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
            variant={isCurrentlyActive ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            isLoading={isSubmitting}
          >
            {actionText} Club
          </Button>
        </>
      }
    >
      <div className="text-xs sm:text-sm text-content-secondary space-y-2">
        <p>
          Target Club: <span className="font-semibold text-content-primary">{club.name}</span>
        </p>
        <p>
          Current Status:{' '}
          <span
            className={`font-semibold ${
              isCurrentlyActive ? 'text-success' : 'text-content-muted'
            }`}
          >
            {isCurrentlyActive ? 'Active' : 'Inactive'}
          </span>
        </p>
      </div>
    </Modal>
  );
};

export default ClubStatusModal;
