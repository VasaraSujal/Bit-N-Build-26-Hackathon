import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';

export const CreateEventModal = ({ isOpen, onClose, preselectedClubId, onSuccess }) => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [clubs, setClubs] = useState([]);
  const [formData, setFormData] = useState({
    clubId: preselectedClubId || user?.clubId || '',
    name: '',
    description: '',
    eventDate: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        clubId: preselectedClubId || user?.clubId || '',
        name: '',
        description: '',
        eventDate: ''
      });
      setErrors({});

      if (isSuperAdmin) {
        api.get('clubs')
          .then((res) => {
            setClubs(res.data?.clubs || []);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, preselectedClubId, user, isSuperAdmin]);

  const validate = () => {
    const errs = {};
    if (!formData.clubId) {
      errs.clubId = 'Please select a club';
    }

    if (!formData.name.trim()) {
      errs.name = 'Event name is required';
    } else if (formData.name.trim().length > 150) {
      errs.name = 'Event name cannot exceed 150 characters';
    }

    if (!formData.eventDate) {
      errs.eventDate = 'Event date and time is required';
    } else if (isNaN(Date.parse(formData.eventDate))) {
      errs.eventDate = 'Please select a valid date';
    }

    if (formData.description && formData.description.length > 1000) {
      errs.description = 'Description cannot exceed 1000 characters';
    }

    // Check if selected club is inactive (for Super Admin)
    if (isSuperAdmin && clubs.length > 0 && formData.clubId) {
      const selected = clubs.find((c) => c.id === formData.clubId);
      if (selected && !selected.isActive) {
        errs.clubId = 'Cannot create events for an inactive club. Please activate the club first.';
      }
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
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        clubId: formData.clubId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        eventDate: new Date(formData.eventDate).toISOString()
      };

      const res = await api.post('events', payload);
      success(res.message || 'Event created successfully.');
      onSuccess?.(res.data?.event);
      onClose();
    } catch (err) {
      toastError(err.message || 'Failed to create event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Event"
      description="Schedule a new club event, workshop, hackathon, or general meeting."
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
            Create Event
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isSuperAdmin && !preselectedClubId && (
          <Select
            label="Assigned Club"
            required
            value={formData.clubId}
            onChange={(e) => handleChange('clubId', e.target.value)}
            error={errors.clubId}
            disabled={isSubmitting}
            options={[
              { value: '', label: '-- Select Club --' },
              ...clubs.map((c) => ({
                value: c.id,
                label: `${c.name}${!c.isActive ? ' (Inactive)' : ''}`
              }))
            ]}
          />
        )}

        <Input
          label="Event Name"
          required
          placeholder="e.g. Annual Hackathon 2026"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          disabled={isSubmitting}
          maxLength={150}
        />

        <Input
          label="Event Date & Time"
          required
          type="datetime-local"
          value={formData.eventDate}
          onChange={(e) => handleChange('eventDate', e.target.value)}
          error={errors.eventDate}
          disabled={isSubmitting}
          helperText="Scheduled commencement date and start time."
        />

        <Textarea
          label="Description"
          placeholder="Provide event objectives, target audience, venue info, and agenda details..."
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          error={errors.description}
          disabled={isSubmitting}
          rows={3}
          helperText="Optional. Max 1000 characters."
        />
      </form>
    </Modal>
  );
};

export default CreateEventModal;
