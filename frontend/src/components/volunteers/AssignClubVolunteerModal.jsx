import React, { useState, useEffect } from 'react';
import { UserPlus, User } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const AssignClubVolunteerModal = ({
  isOpen,
  onClose,
  clubs = [],
  volunteer = null,
  availableMembers = [],
  onSuccess
}) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [selectedClubId, setSelectedClubId] = useState(volunteer?.clubId || '');
  const [selectedUserId, setSelectedUserId] = useState(volunteer?.id || '');
  const [memberOptionsList, setMemberOptionsList] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Update state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (volunteer) {
      setSelectedClubId(volunteer.clubId || '');
      setSelectedUserId(volunteer.id || '');
      setError('');
    } else {
      setSelectedClubId('');
      setSelectedUserId('');
      setError('');

      if (availableMembers.length > 0) {
        setMemberOptionsList(availableMembers);
      } else {
        setIsLoadingMembers(true);
        api.get('users')
          .then((res) => {
            setMemberOptionsList(res.data?.users || []);
          })
          .catch(() => {})
          .finally(() => setIsLoadingMembers(false));
      }
    }
  }, [volunteer, isOpen, availableMembers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetUserId = (volunteer?.id || selectedUserId).trim();
    const targetClubId = selectedClubId.trim();

    if (!targetUserId) {
      setError('Please select a campus member.');
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
      title={volunteer ? `Assign ${volunteer.name} to Club` : 'Assign Member to Club Roster'}
      description="Select the destination club organization to add this student member to its official roster."
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
          <Select
            label="Select Campus Member"
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              setError('');
            }}
            required
            disabled={isSubmitting || isLoadingMembers}
            options={[
              { value: '', label: '-- Select a campus member --' },
              ...memberOptionsList.map((m) => ({
                value: m.id,
                label: `${m.name} (${m.email})${m.clubName ? ` — [${m.clubName}]` : ' — [Unassigned]'}`
              }))
            ]}
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
            { value: '', label: '-- Select a target club --' },
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
