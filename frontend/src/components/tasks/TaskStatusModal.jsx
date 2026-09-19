import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do — Pending execution' },
  { value: 'in_progress', label: 'In Progress — Work currently active' },
  { value: 'done', label: 'Done — Task completed' },
  { value: 'blocked', label: 'Blocked — Impeded by external dependency' }
];

export const TaskStatusModal = ({
  isOpen,
  onClose,
  eventId,
  task,
  onSuccess
}) => {
  const { success, error: toastError } = useToast();
  const [selectedStatus, setSelectedStatus] = useState(task?.status || 'todo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task?.status) {
      setSelectedStatus(task.status);
    }
  }, [task, isOpen]);

  if (!task) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) return;

    setIsSubmitting(true);
    try {
      const res = await api.patch(`events/${eventId}/tasks/${task.id}/status`, {
        status: selectedStatus
      });
      success(res.message || 'Task status updated successfully.');
      onSuccess?.(res.data?.task);
      onClose();
    } catch (err) {
      toastError(err.message || 'Failed to update task status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Task Status"
      description={`Change the current operational state for this task.`}
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
            Update Status
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-surface-muted/50 border border-border rounded-lg text-xs">
          <span className="text-content-muted block mb-0.5">Task Description:</span>
          <span className="font-medium text-content-primary">"{task.description}"</span>
        </div>

        <Select
          label="New Status"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          options={STATUS_OPTIONS}
          disabled={isSubmitting}
        />
      </form>
    </Modal>
  );
};

export default TaskStatusModal;
