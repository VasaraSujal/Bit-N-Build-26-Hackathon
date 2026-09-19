import React, { useState } from 'react';
import { AlertTriangle, UserMinus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const RemoveClubVolunteerModal = ({
  isOpen,
  onClose,
  volunteer,
  clubName,
  onSuccess
}) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !volunteer) return null;

  const handleRemove = async () => {
    if (!volunteer.clubId || !volunteer.id) return;
    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.delete(`clubs/${volunteer.clubId}/volunteers/${volunteer.id}`);
      toastSuccess(
        res.message || 'Volunteer unassigned from club.',
        'Volunteer Removed'
      );
      if (onSuccess) {
        onSuccess(volunteer);
      }
      onClose();
    } catch (err) {
      const msg = err.message || 'Failed to remove volunteer from club.';
      setError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Remove Volunteer from Club?"
      description={`Are you sure you want to unassign ${volunteer.name} from ${clubName || 'this club'}?`}
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
            onClick={handleRemove}
            isLoading={isSubmitting}
            icon={<UserMinus className="w-4 h-4" />}
          >
            Remove from Club
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && (
          <div className="p-3 bg-danger-subtle border border-danger-border rounded-md text-xs text-danger">
            {error}
          </div>
        )}

        <div className="p-3 bg-warning-subtle border border-warning-border rounded-md text-xs text-warning-text leading-relaxed">
          ⚠️ <strong>Notice:</strong> The user's role will remain as <strong>VOLUNTEER</strong>, but their club affiliation will be reset to unassigned. They will lose access to club-specific events until reassigned.
        </div>

        <div className="p-3 bg-surface-muted border border-border rounded-md text-xs space-y-1">
          <p className="font-semibold text-content-primary">{volunteer.name}</p>
          <p className="text-content-secondary">{volunteer.email}</p>
        </div>
      </div>
    </Modal>
  );
};

export default RemoveClubVolunteerModal;
