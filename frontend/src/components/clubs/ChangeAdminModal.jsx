import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const ChangeAdminModal = ({ isOpen, onClose, club, members = [], onSuccess }) => {
  const { success, error: toastError } = useToast();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [customUserId, setCustomUserId] = useState('');
  const [useCustomId, setUseCustomId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const eligibleMembers = members.filter((m) => m.isActive && m.role === 'VOLUNTEER');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetId = useCustomId ? customUserId.trim() : selectedUserId;

    if (!targetId) {
      setError('Please select or provide a valid user ID');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.patch(`clubs/${club.id}/admin`, { userId: targetId });
      success(res.message || 'Club Admin updated successfully.');
      setSelectedUserId('');
      setCustomUserId('');
      onSuccess?.(res.data?.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update Club Admin.');
      toastError(err.message || 'Failed to update Club Admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Club Administrator"
      description={`Assign a new administrator for ${club?.name || 'this club'}. If a previous admin existed, they will be demoted to Volunteer.`}
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
          >
            Confirm Assignment
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {eligibleMembers.length > 0 && !useCustomId ? (
          <div>
            <Select
              label="Select from Club Volunteers"
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setError('');
              }}
              error={error}
              disabled={isSubmitting}
              options={[
                { value: '', label: '-- Select a member --' },
                ...eligibleMembers.map((m) => ({
                  value: m.id,
                  label: `${m.name} (${m.email})`
                }))
              ]}
            />
            <button
              type="button"
              onClick={() => {
                setUseCustomId(true);
                setError('');
              }}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Or enter a specific user ID manually
            </button>
          </div>
        ) : (
          <div>
            <Input
              label="User ID"
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={customUserId}
              onChange={(e) => {
                setCustomUserId(e.target.value);
                setError('');
              }}
              error={error}
              disabled={isSubmitting}
              helperText="Enter the UUID of the active user to promote to Club Admin."
            />
            {eligibleMembers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setUseCustomId(false);
                  setError('');
                }}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Or select from current club members
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};

export default ChangeAdminModal;
