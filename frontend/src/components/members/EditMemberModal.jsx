import React, { useState, useEffect } from 'react';
import { Edit2, Mail, User, Shield, Building2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const EditMemberModal = ({
  isOpen,
  onClose,
  member = null,
  clubs = [],
  currentUserRole = 'VOLUNTEER',
  onSuccess
}) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VOLUNTEER');
  const [clubId, setClubId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member && isOpen) {
      setName(member.name || '');
      setEmail(member.email || '');
      setRole(member.role || 'VOLUNTEER');
      setClubId(member.clubId || member.club_id || '');
      setIsActive(member.isActive !== undefined ? member.isActive : (member.is_active !== undefined ? member.is_active : true));
      setError('');
    }
  }, [member, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!member?.id) return;

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        role: isSuperAdmin ? role : undefined,
        clubId: isSuperAdmin ? (clubId || null) : undefined,
        isActive
      };

      const res = await api.put(`users/${member.id}`, payload);

      toastSuccess(
        res.message || 'Member details updated successfully!',
        'Member Updated'
      );

      if (onSuccess) {
        onSuccess(res.data?.user);
      }
      onClose();
    } catch (err) {
      const msg = err.message || 'Failed to update member details.';
      setError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Member: ${member.name}`}
      description="Update member contact information, system role, or active status."
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
            icon={<Edit2 className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-danger-subtle border border-danger-border rounded-md text-xs text-danger">
            {error}
          </div>
        )}

        <Input
          label="Full Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          leftIcon={<User className="w-4 h-4 text-content-muted" />}
          required
          disabled={isSubmitting}
        />

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          leftIcon={<Mail className="w-4 h-4 text-content-muted" />}
          required
          disabled={isSubmitting}
        />

        {isSuperAdmin && (
          <Select
            label="User Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isSubmitting}
            options={[
              { value: 'VOLUNTEER', label: 'Volunteer / Member' },
              { value: 'CLUB_ADMIN', label: 'Club Admin' }
            ]}
          />
        )}

        {isSuperAdmin && (
          <Select
            label="Club Assignment"
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            disabled={isSubmitting}
            options={[
              { value: '', label: 'Unassigned Pool (General Campus Member)' },
              ...clubs.map((c) => ({
                value: c.id,
                label: c.name
              }))
            ]}
          />
        )}

        <Select
          label="Account Status"
          value={isActive ? 'true' : 'false'}
          onChange={(e) => setIsActive(e.target.value === 'true')}
          disabled={isSubmitting}
          options={[
            { value: 'true', label: 'Active Account' },
            { value: 'false', label: 'Deactivated Account' }
          ]}
        />
      </form>
    </Modal>
  );
};

export default EditMemberModal;
