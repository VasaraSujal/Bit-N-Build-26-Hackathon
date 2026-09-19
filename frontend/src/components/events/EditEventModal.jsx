import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const EditEventModal = ({ isOpen, onClose, event, onSuccess }) => {
  const { success, error: toastError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventDate: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (event) {
      // Format ISO string to datetime-local value (YYYY-MM-DDTHH:mm)
      let formattedDate = '';
      if (event.eventDate) {
        try {
          const d = new Date(event.eventDate);
          const pad = (n) => String(n).padStart(2, '0');
          formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
          formattedDate = '';
        }
      }

      setFormData({
        name: event.name || '',
        description: event.description || '',
        eventDate: formattedDate
      });
      setErrors({});
    }
  }, [event, isOpen]);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Event name is required';
    } else if (formData.name.trim().length > 150) {
      errs.name = 'Event name cannot exceed 150 characters';
    }

    if (!formData.eventDate) {
      errs.eventDate = 'Event date is required';
    } else if (isNaN(Date.parse(formData.eventDate))) {
      errs.eventDate = 'Please select a valid date';
    }

    if (formData.description && formData.description.length > 1000) {
      errs.description = 'Description cannot exceed 1000 characters';
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
    if (!validate() || !event?.id) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        eventDate: new Date(formData.eventDate).toISOString()
      };

      const res = await api.put(`events/${event.id}`, payload);
      success(res.message || 'Event updated successfully.');
      onSuccess?.(res.data?.event);
      onClose();
    } catch (err) {
      toastError(err.message || 'Failed to update event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Event Details"
      description="Update event schedule, title, and operational details."
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
        />

        <Textarea
          label="Description"
          placeholder="Provide event objectives, target audience, venue info, and agenda details..."
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          error={errors.description}
          disabled={isSubmitting}
          rows={3}
          helperText="Max 1000 characters."
        />
      </form>
    </Modal>
  );
};

export default EditEventModal;
