import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User, Shield, Building2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const CreateMemberModal = ({
  isOpen,
  onClose,
  clubs = [],
  currentUserRole = 'VOLUNTEER',
  currentUserClubId = null,
  onSuccess
}) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('VOLUNTEER');
  const [clubId, setClubId] = useState(currentUserRole === 'CLUB_ADMIN' ? (currentUserClubId || '') : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setEmail('');
      setPassword('');
      setRole('VOLUNTEER');
      setClubId(currentUserRole === 'CLUB_ADMIN' ? (currentUserClubId || '') : '');
      setError('');
    }
  }, [isOpen, currentUserRole, currentUserClubId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
        role: isSuperAdmin ? role : 'VOLUNTEER',
        clubId: clubId ? clubId : null
      };

      const res = await api.post('users', payload);

      toastSuccess(
        res.message || 'New member created successfully!',
        'Member Created'
      );

      if (onSuccess) {
        onSuccess(res.data?.user);
      }
      onClose();
    } catch (err) {
      const msg = err.message || 'Failed to create new member.';
      setError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Member / Provision User"
      description="Directly register and provision a new student member or administrator. Set an initial password for first login."
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
            icon={<UserPlus className="w-4 h-4" />}
          >
            Create Member
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
          placeholder="e.g. Ananya Patel"
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
          placeholder="e.g. ananya@college.edu"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          leftIcon={<Mail className="w-4 h-4 text-content-muted" />}
          required
          disabled={isSubmitting}
        />

        <Input
          label="Initial Password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          leftIcon={<Lock className="w-4 h-4 text-content-muted" />}
          required
          helperText="The user will use this initial password to log in."
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

        <Select
          label="Assign to Club"
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          disabled={isSubmitting || currentUserRole === 'CLUB_ADMIN'}
          options={[
            { value: '', label: 'Unassigned Pool (General Campus Member)' },
            ...clubs.map((c) => ({
              value: c.id,
              label: c.name
            }))
          ]}
          helperText={
            currentUserRole === 'CLUB_ADMIN'
              ? 'As a Club Admin, created members are assigned to your club roster.'
              : 'Select a club to assign immediately, or leave unassigned.'
          }
        />
      </form>
    </Modal>
  );
};

export default CreateMemberModal;
