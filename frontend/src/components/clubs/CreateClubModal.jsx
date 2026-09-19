import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const CreateClubModal = ({ isOpen, onClose, onSuccess }) => {
  const { success, error: toastError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        errs.logoUrl = 'Please enter a valid URL (e.g. https://example.com/logo.png)';
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

  const handleReset = () => {
    setFormData({ name: '', description: '', logoUrl: '' });
    setErrors({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        logoUrl: formData.logoUrl.trim() || undefined
      };

      const res = await api.post('clubs', payload);
      success(res.message || 'Club created successfully.');
      handleReset();
      onSuccess?.(res.data?.club);
      onClose();
    } catch (err) {
      if (err.status === 409) {
        setErrors((prev) => ({ ...prev, name: 'A club with this name already exists' }));
      } else {
        toastError(err.message || 'Failed to create club. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Club"
      description="Register a new student club to start organizing events and volunteer activities."
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClose}
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
            Create Club
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
          helperText="Optional. Max 500 characters."
        />

        <Input
          label="Logo URL"
          placeholder="https://example.com/logo.png"
          value={formData.logoUrl}
          onChange={(e) => handleChange('logoUrl', e.target.value)}
          error={errors.logoUrl}
          disabled={isSubmitting}
          helperText="Optional. Direct web link to the club image or badge."
        />
      </form>
    </Modal>
  );
};

export default CreateClubModal;
