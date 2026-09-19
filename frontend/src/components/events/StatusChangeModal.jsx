import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming — Scheduled and in preparation' },
  { value: 'ongoing', label: 'Ongoing — Event is currently in progress' },
  { value: 'completed', label: 'Completed — Event has ended successfully' },
  { value: 'cancelled', label: 'Cancelled — Event cancelled' }
];

export const StatusChangeModal = ({ isOpen, onClose, event, onSuccess }) => {
  const { success, error: toastError } = useToast();
  const [selectedStatus, setSelectedStatus] = useState(event?.status || 'upcoming');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (event?.status) {
      setSelectedStatus(event.status);
    }
  }, [event, isOpen]);

  if (!event) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) return;

    setIsSubmitting(true);
    try {
      const res = await api.patch(`events/${event.id}/status`, { status: selectedStatus });
      success(res.message || 'Event status updated successfully.');
      onSuccess?.(res.data?.event);
      onClose();
    } catch (err) {
      toastError(err.message || 'Failed to update event status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Event Status"
      description={`Change the operational status for ${event.name}.`}
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

export default StatusChangeModal;
