import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const EditClubModal = ({ isOpen, onClose, club, onSuccess }) => {
  const { success, error: toastError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (club) {
      setFormData({
        name: club.name || '',
        description: club.description || '',
        logoUrl: club.logoUrl || ''
      });
      setErrors({});
    }
  }, [club, isOpen]);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Club name is required';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Club name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      errs.name = 'Club name cannot exceed 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      errs.description = 'Description cannot exceed 500 characters';
    }

    if (formData.logoUrl && formData.logoUrl.trim()) {
      try {
        new URL(formData.logoUrl.trim());
      } catch {
        errs.logoUrl = 'Please enter a valid URL';
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
    if (!validate() || !club?.id) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        logoUrl: formData.logoUrl.trim() || null
      };

      const res = await api.put(`clubs/${club.id}`, payload);
      success(res.message || 'Club updated successfully.');
      onSuccess?.(res.data?.club);
      onClose();
    } catch (err) {
      if (err.status === 409) {
        setErrors((prev) => ({ ...prev, name: 'Another club with this name already exists' }));
      } else {
        toastError(err.message || 'Failed to update club. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Club Details"
      description={`Update metadata and profile for ${club?.name || 'this club'}.`}
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
          label="Club Name"
          required
          placeholder="e.g. Developer Student Club"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          disabled={isSubmitting}
          maxLength={100}
        />

        <Textarea
          label="Description"
          placeholder="Brief description of the club's focus and mission..."
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          error={errors.description}
          disabled={isSubmitting}
          rows={3}
          helperText="Max 500 characters."
        />

        <Input
          label="Logo URL"
          placeholder="https://example.com/logo.png"
          value={formData.logoUrl}
          onChange={(e) => handleChange('logoUrl', e.target.value)}
          error={errors.logoUrl}
          disabled={isSubmitting}
          helperText="Direct web link to club logo image."
        />
      </form>
    </Modal>
  );
};

export default EditClubModal;
