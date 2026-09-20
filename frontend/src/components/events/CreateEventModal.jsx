import React, { useState, useEffect } from 'react';
import { UserPlus, Calendar, Building2, Check, Users } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../lib/api';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';

export const CreateEventModal = ({ isOpen, onClose, preselectedClubId, defaultClubId, onSuccess }) => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const initialClubId = preselectedClubId || defaultClubId || user?.clubId || '';

  const [clubs, setClubs] = useState([]);
  const [clubMembers, setClubMembers] = useState([]);
  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const [formData, setFormData] = useState({
    clubId: initialClubId,
    name: '',
    description: '',
    eventDate: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available clubs (if super admin)
  useEffect(() => {
    if (isOpen) {
      const activeClubId = preselectedClubId || defaultClubId || user?.clubId || '';
      setFormData({
        clubId: activeClubId,
        name: '',
        description: '',
        eventDate: ''
      });
      setSelectedVolunteerIds([]);
      setErrors({});

      if (isSuperAdmin) {
        api.get('clubs')
          .then((res) => {
            setClubs(res.data?.clubs || []);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, preselectedClubId, defaultClubId, user, isSuperAdmin]);

  // Fetch members of selected club when clubId changes
  useEffect(() => {
    if (isOpen && formData.clubId) {
      setIsLoadingMembers(true);
      api.get(`clubs/${formData.clubId}/members`)
        .then((res) => {
          const members = res.data?.members || [];
          // Only list active VOLUNTEER members
          const volunteersOnly = members.filter((m) => m.role === 'VOLUNTEER' && m.isActive);
          setClubMembers(volunteersOnly);
        })
        .catch(() => setClubMembers([]))
        .finally(() => setIsLoadingMembers(false));
    } else {
      setClubMembers([]);
    }
  }, [isOpen, formData.clubId]);

  const toggleVolunteerSelection = (memberId) => {
    setSelectedVolunteerIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

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
      const createdEvent = res.data?.event;

      // Assign initial selected volunteers to this event roster
      if (createdEvent && selectedVolunteerIds.length > 0) {
        const assignPromises = selectedVolunteerIds.map((volUserId) =>
          api.post(`events/${createdEvent.id}/volunteers`, {
            userId: volUserId,
            responsibility: 'Event Volunteer'
          }).catch(() => null)
        );
        await Promise.all(assignPromises);
      }

      const msg = selectedVolunteerIds.length > 0
        ? `Event created with ${selectedVolunteerIds.length} initial volunteer(s) assigned!`
        : (res.message || 'Event created successfully.');

      success(msg);
      onSuccess?.(createdEvent);
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
      description="Schedule a new event and optionally assign initial volunteers from your club roster."
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
        {isSuperAdmin && !preselectedClubId && !defaultClubId && (
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
          placeholder="e.g. Annual Cricket Tournament 2026"
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
          placeholder="Provide event objectives, venue info, and agenda details..."
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          error={errors.description}
          disabled={isSubmitting}
          rows={3}
          helperText="Optional. Max 1000 characters."
        />

        {/* Initial Event Volunteers Selection */}
        {formData.clubId && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-content-primary flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                Assign Initial Event Volunteers (Optional)
              </label>
              <span className="text-[11px] text-content-secondary">
                {selectedVolunteerIds.length} selected
              </span>
            </div>

            {isLoadingMembers ? (
              <p className="text-xs text-content-secondary italic">Loading club members...</p>
            ) : clubMembers.length === 0 ? (
              <p className="text-xs text-content-secondary italic bg-surface-muted p-2.5 rounded border border-border">
                No active club members found to assign for this event.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-border rounded-md divide-y divide-border bg-surface p-1 space-y-1">
                {clubMembers.map((m) => {
                  const isSelected = selectedVolunteerIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleVolunteerSelection(m.id)}
                      className={`p-2 rounded cursor-pointer flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? 'bg-primary-subtle border border-primary-border text-primary font-semibold'
                          : 'hover:bg-surface-hover text-content-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-primary border-primary text-white' : 'border-border bg-surface'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>{m.name}</span>
                      </div>
                      <span className="text-[11px] text-content-secondary font-mono">{m.email}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};

export default CreateEventModal;
