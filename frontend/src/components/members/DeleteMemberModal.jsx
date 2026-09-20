import React, { useState } from 'react';
import { AlertTriangle, Trash2, Building2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const DeleteMemberModal = ({
  isOpen,
  onClose,
  member = null,
  onSuccess
}) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !member) return null;

  const isAssigned = Boolean(member.clubId || member.club_id || member.clubName);
  const clubName = member.clubName || 'a club roster';

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      const res = await api.delete(`users/${member.id}`);
      toastSuccess(
        res.message || `Member ${member.name} deleted successfully.`,
        'Member Deleted'
      );
      if (onSuccess) {
        onSuccess(member.id);
      }
      onClose();
    } catch (err) {
      const msg = err.message || 'Failed to delete member.';
      setError(msg);
      toastError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAssigned ? 'Warning: Delete Assigned Member' : 'Delete Member Account'}
      description={
        isAssigned
          ? `Member ${member.name} is currently assigned to ${clubName}.`
          : `Are you sure you want to permanently delete member ${member.name}?`
      }
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="bg-danger hover:bg-danger-hover text-white"
            onClick={handleDelete}
            isLoading={isDeleting}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Confirm Permanent Deletion
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

        {isAssigned ? (
          <div className="p-3 bg-warning-subtle border border-warning-border rounded-md text-xs text-warning space-y-1.5">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Active Club Assignment Detected!</span>
            </div>
            <p className="text-[11px] text-content-primary">
              This member is currently assigned to <strong className="font-semibold">{clubName}</strong>. Deleting this member will also remove them from all active event rosters and unassign their active tasks.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-surface-muted border border-border rounded-md text-xs text-content-secondary">
            This member is unassigned. Deleting will permanently remove their profile and access credentials.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DeleteMemberModal;
