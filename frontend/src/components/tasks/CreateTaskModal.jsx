import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { SameDayTaskConfirmationModal } from './SameDayTaskConfirmationModal';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const CreateTaskModal = ({
  isOpen,
  onClose,
  eventId,
  clubId,
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
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Same-day assignment confirmation state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictTasks, setConflictTasks] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setFormData({ description: '', assignedTo: '', deadline: '' });
      setErrors({});
      setShowConflictModal(false);
      setConflictTasks([]);

      if (eventId) {
        setIsLoadingAssignees(true);
        Promise.all([
          api.get(`events/${eventId}/volunteers`).catch(() => ({ data: { volunteers: [] } })),
          clubId ? api.get(`clubs/${clubId}/members`).catch(() => ({ data: { members: [] } })) : Promise.resolve({ data: { members: [] } })
        ])
          .then(([volRes, memRes]) => {
            setVolunteers(volRes.data?.volunteers || []);
            const admin = memRes.data?.members?.find((m) => m.role === 'CLUB_ADMIN' && m.isActive);
            setClubAdmin(admin || null);
          })
          .finally(() => {
            setIsLoadingAssignees(false);
          });
      }
    }
  }, [isOpen, eventId, clubId]);

  // Combine eligible assignees (Assigned Volunteers + Club Admin)
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
    // Avoid duplicate if admin is also in volunteers list
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

  const submitTask = async (confirmed = false) => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        description: formData.description.trim(),
        assignedTo: formData.assignedTo || undefined,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
        confirmSameDayAssignment: confirmed ? true : undefined
      };

      const res = await api.post(`events/${eventId}/tasks`, payload);
      success(res.message || 'Task created successfully.');
      setShowConflictModal(false);
      onSuccess?.(res.data?.task);
      onClose();
    } catch (err) {
      const data = err.data;
      if (err.status === 409 && (data?.requiresConfirmation || data?.requires_confirmation)) {
        const tasks = data?.data?.conflictingTasks || data?.conflictingTasks || data?.existing_tasks || [];
        setConflictTasks(tasks);
        setShowConflictModal(true);
      } else {
        toastError(err.message || 'Failed to create task.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitTask(false);
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Event Task"
      description="Define an actionable item, assign an event volunteer, and set a completion deadline."
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
            Create Task
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          label="Task Description"
          required
          placeholder="Describe what needs to be done, requirements, or deliverables..."
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
          disabled={isSubmitting || isLoadingAssignees}
          options={assigneeOptions}
          helperText="Only volunteers assigned to this event or the club administrator can be selected."
        />

        <Input
          label="Deadline"
          type="datetime-local"
          value={formData.deadline}
          onChange={(e) => handleChange('deadline', e.target.value)}
          error={errors.deadline}
          disabled={isSubmitting}
          helperText="Optional target date & time for completion."
        />
      </form>

      {/* Same-Day Task Assignment Confirmation Modal */}
      <SameDayTaskConfirmationModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        onConfirm={() => submitTask(true)}
        conflictingTasks={conflictTasks}
        isSubmitting={isSubmitting}
      />
    </Modal>
  );
};


export default CreateTaskModal;
