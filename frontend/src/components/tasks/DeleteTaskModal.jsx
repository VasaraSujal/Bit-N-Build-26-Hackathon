import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const DeleteTaskModal = ({
  isOpen,
  onClose,
  eventId,
  task,
  onSuccess
}) => {
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!task) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.delete(`events/${eventId}/tasks/${task.id}`);
      success(res.message || 'Task deleted successfully.');
      onSuccess?.();
      onClose();
    } catch (err) {
      toastError(err.message || 'Failed to delete task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete this task?"
      description="This action cannot be undone. The task record and its status will be permanently removed from the event."
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
            Delete Task
          </Button>
        </>
      }
    >
      <div className="text-xs sm:text-sm text-content-secondary space-y-2">
        <p>
          Task: <span className="font-semibold text-content-primary">"{task.description}"</span>
        </p>
        <p>
          Assigned to:{' '}
          <span className="font-semibold text-content-primary">
            {task.assignedTo?.name || 'Unassigned'}
          </span>
        </p>
        <p className="text-danger-text pt-1">
          Are you sure you want to permanently delete this task?
        </p>
      </div>
    </Modal>
  );
};

export default DeleteTaskModal;
