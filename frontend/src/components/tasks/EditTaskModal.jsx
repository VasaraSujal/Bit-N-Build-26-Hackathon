import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const EditTaskModal = ({
  isOpen,
  onClose,
  eventId,
  clubId,
  task,
  onSuccess
}) => {
  const { success, error: toastError } = useToast();
  const [volunteers, setVolunteers] = useState([]);
  const [clubAdmin, setClubAdmin] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    assignedTo: '',
    deadline: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      let formattedDate = '';
      if (task.deadline) {
        try {
          const d = new Date(task.deadline);
          const pad = (n) => String(n).padStart(2, '0');
          formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
          formattedDate = '';
        }
      }

      setFormData({
        description: task.description || '',
        assignedTo: task.assignedTo?.id || '',
        deadline: formattedDate
      });
      setErrors({});

      if (eventId) {
        Promise.all([
          api.get(`events/${eventId}/volunteers`).catch(() => ({ data: { volunteers: [] } })),
          clubId ? api.get(`clubs/${clubId}/members`).catch(() => ({ data: { members: [] } })) : Promise.resolve({ data: { members: [] } })
        ])
          .then(([volRes, memRes]) => {
            setVolunteers(volRes.data?.volunteers || []);
            const admin = memRes.data?.members?.find((m) => m.role === 'CLUB_ADMIN' && m.isActive);
            setClubAdmin(admin || null);
          })
          .catch(() => {});
      }
    }
  }, [task, isOpen, eventId, clubId]);

  const assigneeOptions = [
    { value: '', label: 'Unassigned (No owner)' }
  ];

  if (clubAdmin) {
    assigneeOptions.push({
      value: clubAdmin.id,
      label: `${clubAdmin.name} (Club Admin)`
    });
  }

  volunteers.forEach((v) => {
    if (!clubAdmin || v.userId !== clubAdmin.id) {
      assigneeOptions.push({
        value: v.userId,
        label: `${v.name} (${v.responsibility})`
      });
    }
  });

  const validate = () => {
    const errs = {};
    if (!formData.description.trim()) {
      errs.description = 'Task description is required';
    } else if (formData.description.trim().length > 1000) {
      errs.description = 'Description cannot exceed 1000 characters';
    }

    if (formData.deadline && isNaN(Date.parse(formData.deadline))) {
      errs.deadline = 'Please select a valid deadline';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || !task?.id) return;

    setIsSubmitting(true);
    try {
      const payload = {
        description: formData.description.trim(),
        assignedTo: formData.assignedTo || null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null
      };

      const res = await api.put(`events/${eventId}/tasks/${task.id}`, payload);
      success(res.message || 'Task updated successfully.');
      onSuccess?.(res.data?.task);
      onClose();
    } catch (err) {
      toastError(err.message || 'Failed to update task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Event Task"
      description="Modify task description, reassignment, or deadline."
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
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          label="Task Description"
          required
          placeholder="Describe task item..."
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          error={errors.description}
          disabled={isSubmitting}
          rows={3}
          maxLength={1000}
        />

        <Select
          label="Assignee"
          value={formData.assignedTo}
          onChange={(e) => handleChange('assignedTo', e.target.value)}
          error={errors.assignedTo}
          disabled={isSubmitting}
          options={assigneeOptions}
        />

        <Input
          label="Deadline"
          type="datetime-local"
          value={formData.deadline}
          onChange={(e) => handleChange('deadline', e.target.value)}
          error={errors.deadline}
          disabled={isSubmitting}
        />
      </form>
    </Modal>
  );
};

export default EditTaskModal;
