import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const AddVolunteerModal = ({
  isOpen,
  onClose,
  eventId,
  clubId,
  currentVolunteers = [],
  onSuccess
}) => {
  const { success, error: toastError } = useToast();
  const [clubMembers, setClubMembers] = useState([]);
  const [formData, setFormData] = useState({
    userId: '',
    responsibility: '',
    contact: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({ userId: '', responsibility: '', contact: '' });
      setErrors({});

      if (clubId) {
        setIsLoadingMembers(true);
        api.get(`clubs/${clubId}/members`)
          .then((res) => {
            setClubMembers(res.data?.members || []);
          })
          .catch(() => {
            setClubMembers([]);
          })
          .finally(() => {
            setIsLoadingMembers(false);
          });
      }
    }
  }, [isOpen, clubId]);

  // Filter eligible members: Active, role === 'VOLUNTEER' (or club member), not already assigned
  const assignedUserIds = new Set(currentVolunteers.map((v) => v.userId));
  const eligibleMembers = clubMembers.filter(
    (m) => m.isActive && m.role !== 'SUPER_ADMIN' && !assignedUserIds.has(m.id)
  );

  const validate = () => {
    const errs = {};
    if (!formData.userId) {
      errs.userId = 'Please select a volunteer to assign';
    }
    if (!formData.responsibility.trim()) {
      errs.responsibility = 'Event responsibility is required (e.g. Stage Management, Registration)';
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
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        userId: formData.userId,
        responsibility: formData.responsibility.trim(),
        contact: formData.contact.trim() || undefined
      };

      const res = await api.post(`events/${eventId}/volunteers`, payload);
      success(res.message || 'Volunteer assigned to event successfully.');
      onSuccess?.(res.data?.volunteer);
      onClose();
    } catch (err) {
      if (err.status === 409) {
        setErrors((prev) => ({ ...prev, userId: 'This volunteer is already assigned to this event' }));
      } else {
        toastError(err.message || 'Failed to assign volunteer to event.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Volunteer to Event"
      description="Assign a club volunteer with an event responsibility (e.g. Registration, Technical Support, Hospitality)."
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
            disabled={isLoadingMembers || eligibleMembers.length === 0}
          >
            Assign Volunteer
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isLoadingMembers ? (
          <p className="text-xs text-content-muted">Loading club members...</p>
        ) : eligibleMembers.length === 0 ? (
          <div className="p-3 bg-warning-subtle border border-warning-border rounded-lg text-xs text-warning-text">
            No unassigned active club members found. All members are already assigned to this event or no active volunteers are registered in the club.
          </div>
        ) : (
          <Select
            label="Select Volunteer"
            required
            value={formData.userId}
            onChange={(e) => handleChange('userId', e.target.value)}
            error={errors.userId}
            disabled={isSubmitting}
            options={[
              { value: '', label: '-- Choose a club member --' },
              ...eligibleMembers.map((m) => ({
                value: m.id,
                label: `${m.name} (${m.email})`
              }))
            ]}
          />
        )}

        <Input
          label="Event Responsibility"
          required
          placeholder="e.g. Stage Management, Hospitality, Registration, Logistics"
          value={formData.responsibility}
          onChange={(e) => handleChange('responsibility', e.target.value)}
          error={errors.responsibility}
          disabled={isSubmitting}
          helperText="Functional role or duty for this specific event."
          maxLength={100}
        />

        <Input
          label="Contact Information"
          placeholder="e.g. +91 98765 43210 or Discord handle"
          value={formData.contact}
          onChange={(e) => handleChange('contact', e.target.value)}
          error={errors.contact}
          disabled={isSubmitting}
          helperText="Optional on-site phone number or channel handle."
          maxLength={50}
        />
      </form>
    </Modal>
  );
};

export default AddVolunteerModal;
