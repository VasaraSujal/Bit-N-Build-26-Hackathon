import React, { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { SameDayTaskConfirmationModal } from './SameDayTaskConfirmationModal';
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
  const [clubMembers, setClubMembers] = useState([]);
  const [clubAdmin, setClubAdmin] = useState(null);
  const [selectedRecruitId, setSelectedRecruitId] = useState('');
  const [isRecruiting, setIsRecruiting] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    assignedTo: '',
    deadline: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Same-day assignment confirmation state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictTasks, setConflictTasks] = useState([]);

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
      setShowConflictModal(false);
      setConflictTasks([]);
      setSelectedRecruitId('');

      if (eventId) {
        Promise.all([
          api.get(`events/${eventId}/volunteers`).catch(() => ({ data: { volunteers: [] } })),
          clubId ? api.get(`clubs/${clubId}/members`).catch(() => ({ data: { members: [] } })) : Promise.resolve({ data: { members: [] } })
        ])
          .then(([volRes, memRes]) => {
            const loadedVols = volRes.data?.volunteers || [];
            const loadedMems = memRes.data?.members || [];
            setVolunteers(loadedVols);
            setClubMembers(loadedMems);
            const admin = loadedMems.find((m) => m.role === 'CLUB_ADMIN' && m.isActive);
            setClubAdmin(admin || null);
          })
          .catch(() => {});
      }
    }
  }, [task, isOpen, eventId, clubId]);

  // Club members who belong to the club but are not yet assigned to this event
  const availableClubMembersToRecruit = clubMembers.filter(
    (m) => m.role === 'VOLUNTEER' && m.isActive && !volunteers.some((v) => v.userId === m.id)
  );

  const handleRecruitVolunteer = async () => {
    if (!selectedRecruitId || !eventId) return;

    const targetMember = availableClubMembersToRecruit.find((m) => m.id === selectedRecruitId);
    if (!targetMember) return;

    setIsRecruiting(true);
    try {
      await api.post(`events/${eventId}/volunteers`, {
        userId: selectedRecruitId,
        responsibility: 'Event Volunteer'
      });

      const newVol = {
        userId: targetMember.id,
        name: targetMember.name,
        responsibility: 'Event Volunteer',
        contact: ''
      };

      setVolunteers((prev) => [...prev, newVol]);
      handleChange('assignedTo', targetMember.id);
      setSelectedRecruitId('');
      success(`${targetMember.name} recruited into event and selected as task assignee!`);
    } catch (err) {
      toastError(err.message || 'Failed to recruit member into event.');
    } finally {
      setIsRecruiting(false);
    }
  };

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
        label: `${v.name} (${v.responsibility || 'Event Volunteer'})`
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
    if (!validate() || !task?.id) return;

    setIsSubmitting(true);
    try {
      const payload = {
        description: formData.description.trim(),
        assignedTo: formData.assignedTo || null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        confirmSameDayAssignment: confirmed ? true : undefined
      };

      const res = await api.put(`events/${eventId}/tasks/${task.id}`, payload);
      success(res.message || 'Task updated successfully.');
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
        toastError(err.message || 'Failed to update task.');
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
      title="Edit Event Task"
      description="Modify task description, reassignment, or deadline."
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting || isRecruiting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isRecruiting}
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
          disabled={isSubmitting || isRecruiting}
          rows={3}
          maxLength={1000}
        />

        <div className="space-y-2">
          <Select
            label="Assignee (Event Volunteers Only)"
            value={formData.assignedTo}
            onChange={(e) => handleChange('assignedTo', e.target.value)}
            error={errors.assignedTo}
            disabled={isSubmitting || isRecruiting}
            options={assigneeOptions}
            helperText="Only volunteers assigned to this event roster can receive tasks."
          />

          {availableClubMembersToRecruit.length > 0 && (
            <div className="p-3 bg-surface-muted border border-border rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-content-primary flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-primary" />
                  Recruit Member from Club Pool into Event
                </span>
                <span className="text-[11px] text-content-secondary">
                  {availableClubMembersToRecruit.length} available
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    value={selectedRecruitId}
                    onChange={(e) => setSelectedRecruitId(e.target.value)}
                    disabled={isSubmitting || isRecruiting}
                    options={[
                      { value: '', label: '-- Select a free club member --' },
                      ...availableClubMembersToRecruit.map((m) => ({
                        value: m.id,
                        label: `${m.name} (${m.email})`
                      }))
                    ]}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedRecruitId || isRecruiting || isSubmitting}
                  isLoading={isRecruiting}
                  onClick={handleRecruitVolunteer}
                >
                  Recruit & Select
                </Button>
              </div>
            </div>
          )}
        </div>

        <Input
          label="Deadline"
          type="datetime-local"
          value={formData.deadline}
          onChange={(e) => handleChange('deadline', e.target.value)}
          error={errors.deadline}
          disabled={isSubmitting || isRecruiting}
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

export default EditTaskModal;
