import React, { useState } from 'react';
import { UserPlus, Building2, User } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const AssignClubVolunteerModal = ({
  isOpen,
  onClose,
  clubs = [],
  volunteer = null,
  onSuccess
}) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [selectedClubId, setSelectedClubId] = useState(volunteer?.clubId || '');
  const [userIdInput, setUserIdInput] = useState(volunteer?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Update state when modal opens with a specific volunteer
  React.useEffect(() => {
    if (volunteer) {
      setSelectedClubId(volunteer.clubId || '');
      setUserIdInput(volunteer.id || '');
      setError('');
    } else {
      setSelectedClubId('');
      setUserIdInput('');
      setError('');
    }
  }, [volunteer, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetUserId = (volunteer?.id || userIdInput).trim();
    const targetClubId = selectedClubId.trim();

    if (!targetUserId) {
      setError('Please provide a valid user ID.');
      return;
    }

    if (!targetClubId) {
      setError('Please select a target club.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.patch(`clubs/${targetClubId}/volunteers/${targetUserId}`);
      toastSuccess(
        res.message || 'Volunteer successfully assigned to club roster.',
        'Volunteer Assigned'
      );
      if (onSuccess) {
        onSuccess(res.data?.user);
      }
      onClose();
    } catch (err) {
      const msg = err.message || 'Failed to assign volunteer to club.';
      setError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={volunteer ? `Assign ${volunteer.name} to Club` : 'Assign Volunteer to Club'}
      description="Select the destination club organization to add this student volunteer to its official roster."
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
            onClick={handleSubmit}
            isLoading={isSubmitting}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Confirm Allocation
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-danger-subtle border border-danger-border rounded-md text-xs text-danger">
            {error}
          </div>
        )}

        {volunteer ? (
          <div className="p-3 bg-surface-muted border border-border rounded-md space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-content-primary">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>{volunteer.name}</span>
            </div>
            <p className="text-xs text-content-secondary">{volunteer.email}</p>
          </div>
        ) : (
          <Input
            label="Volunteer User ID"
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            value={userIdInput}
            onChange={(e) => {
              setUserIdInput(e.target.value);
              setError('');
            }}
            required
            helperText="Enter the UUID of the student volunteer to assign."
            disabled={isSubmitting}
          />
        )}

        <Select
          label="Target Club Organization"
          value={selectedClubId}
          onChange={(e) => {
            setSelectedClubId(e.target.value);
            setError('');
          }}
          required
          options={[
            { value: '', label: '-- Select a club --' },
            ...clubs.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.isActive ? 'Active' : 'Inactive'})`
            }))
          ]}
          disabled={isSubmitting}
        />
      </form>
    </Modal>
  );
};

export default AssignClubVolunteerModal;
