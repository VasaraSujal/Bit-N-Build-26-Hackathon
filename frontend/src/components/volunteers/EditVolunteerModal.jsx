import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const EditVolunteerModal = ({
  isOpen,
  onClose,
  eventId,
  volunteer,
  onSuccess
}) => {
  const { success, error: toastError } = useToast();
  const [formData, setFormData] = useState({
    responsibility: '',
    contact: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (volunteer) {
      setFormData({
        responsibility: volunteer.responsibility || '',
        contact: volunteer.contact || ''
      });
      setErrors({});
    }
  }, [volunteer, isOpen]);

  const validate = () => {
    const errs = {};
    if (!formData.responsibility.trim()) {
      errs.responsibility = 'Event responsibility cannot be empty';
    } else if (formData.responsibility.trim().length > 100) {
      errs.responsibility = 'Responsibility cannot exceed 100 characters';
    }
    if (formData.contact && formData.contact.trim().length > 50) {
      errs.contact = 'Contact cannot exceed 50 characters';
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
    if (!validate() || !volunteer?.id) return;

    setIsSubmitting(true);
    try {
      const payload = {
        responsibility: formData.responsibility.trim(),
        contact: formData.contact.trim() || null
      };

      const res = await api.put(`events/${eventId}/volunteers/${volunteer.id}`, payload);
      success(res.message || 'Volunteer assignment updated successfully.');
      onSuccess?.(res.data?.volunteer);
      onClose();
    } catch (err) {
      toastError(err.message || 'Failed to update volunteer assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Volunteer Assignment"
      description={`Update event responsibility or contact info for ${volunteer?.name || 'this volunteer'}.`}
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
            Save Assignment
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-surface-muted/50 border border-border rounded-lg text-xs space-y-1">
          <div className="text-content-muted uppercase tracking-wider text-[10px] font-bold">
            Volunteer Member
          </div>
          <div className="font-semibold text-content-primary text-sm">
            {volunteer?.name}
          </div>
          <div className="text-content-secondary font-mono">
            {volunteer?.email}
          </div>
        </div>

        <Input
          label="Event Responsibility"
          required
          placeholder="e.g. Stage Management, Hospitality, Registration, Logistics"
          value={formData.responsibility}
          onChange={(e) => handleChange('responsibility', e.target.value)}
          error={errors.responsibility}
          disabled={isSubmitting}
          maxLength={100}
        />

        <Input
          label="Contact Information"
          placeholder="e.g. +91 98765 43210 or Discord handle"
          value={formData.contact}
          onChange={(e) => handleChange('contact', e.target.value)}
          error={errors.contact}
          disabled={isSubmitting}
          maxLength={50}
        />
      </form>
    </Modal>
  );
};

export default EditVolunteerModal;
