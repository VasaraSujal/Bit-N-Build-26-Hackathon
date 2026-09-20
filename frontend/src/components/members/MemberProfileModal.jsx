import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  Building2,
  Calendar,
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Shield,
  Briefcase,
  Layers,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { api } from '../../lib/api';
import { useAuth } from '../../context/useAuth';

export const MemberProfileModal = ({
  isOpen,
  onClose,
  userId,
  onActionSuccess
}) => {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'tasks'

  const fetchProfile = useCallback(async () => {
    if (!userId || !isOpen) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.get(`users/${userId}/profile`);
      setProfileData(res.data || null);
    } catch (err) {
      setError(err.message || 'Unable to load member profile history.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isOpen]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (!isOpen) return null;

  const profile = profileData?.profile || null;
  const eventHistory = profileData?.eventHistory || [];
  const tasks = profileData?.tasks || [];
  const stats = profileData?.stats || {
    totalEventsCount: 0,
    totalTasksCount: 0,
    completedTasksCount: 0,
    pendingTasksCount: 0,
    blockedTasksCount: 0
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getTaskStatusBadge = (status) => {
    switch (status) {
      case 'todo':
        return <Badge variant="neutral" size="sm">To Do</Badge>;
      case 'in_progress':
        return <Badge variant="warning" size="sm">In Progress</Badge>;
      case 'done':
        return <Badge variant="success" size="sm">Done</Badge>;
      case 'blocked':
        return <Badge variant="danger" size="sm">Blocked</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="360° Member Profile & Operations History"
      description="Comprehensive view of assigned club, event participation, workload stats, and task history."
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close Profile
        </Button>
      }
    >
      {isLoading && (
        <div className="py-12">
          <LoadingState message="Loading member profile & workload history..." />
        </div>
      )}

      {error && !isLoading && (
        <ErrorState
          title="Failed to Load Profile"
          message={error}
          onRetry={fetchProfile}
        />
      )}

      {!isLoading && !error && profile && (
        <div className="space-y-5">
          {/* Top Profile Header Card */}
          <div className="p-4 bg-surface-muted border border-border rounded-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-subtle text-primary font-bold text-lg flex items-center justify-center shrink-0 border border-primary-border shadow-subtle">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-content-primary">{profile.name}</h3>
                  <Badge variant={profile.role === 'SUPER_ADMIN' ? 'danger' : profile.role === 'CLUB_ADMIN' ? 'info' : 'neutral'} size="sm">
                    {profile.role}
                  </Badge>
                </div>
                <p className="text-xs text-content-secondary flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-content-muted" />
                  {profile.email}
                </p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end gap-1">
              <span className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider">
                Assigned Club
              </span>
              <span className="text-xs font-bold text-content-primary flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                {profile.clubName || 'Unassigned Campus Member'}
              </span>
            </div>
          </div>

          {/* Workload & Performance KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-surface border border-border rounded-panel text-center">
              <p className="text-[11px] font-medium text-content-secondary uppercase tracking-wider">
                Events Joined
              </p>
              <p className="text-base font-bold text-content-primary mt-1">
                {stats.totalEventsCount}
              </p>
            </div>

            <div className="p-3 bg-surface border border-border rounded-panel text-center">
              <p className="text-[11px] font-medium text-content-secondary uppercase tracking-wider">
                Total Tasks
              </p>
              <p className="text-base font-bold text-content-primary mt-1">
                {stats.totalTasksCount}
              </p>
            </div>

            <div className="p-3 bg-success-subtle border border-success-border rounded-panel text-center">
              <p className="text-[11px] font-medium text-success uppercase tracking-wider">
                Completed
              </p>
              <p className="text-base font-bold text-success mt-1">
                {stats.completedTasksCount}
              </p>
            </div>

            <div className="p-3 bg-warning-subtle border border-warning-border rounded-panel text-center">
              <p className="text-[11px] font-medium text-warning uppercase tracking-wider">
                Pending / Active
              </p>
              <p className="text-base font-bold text-warning mt-1">
                {stats.pendingTasksCount}
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-border gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('events')}
              className={`pb-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'events'
                  ? 'text-primary border-b-2 border-primary font-bold'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Event History ({eventHistory.length})
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`pb-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'text-primary border-b-2 border-primary font-bold'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Assigned Tasks ({tasks.length})
            </button>
          </div>

          {/* TAB 1: Event History */}
          {activeTab === 'events' && (
            <div>
              {eventHistory.length === 0 ? (
                <EmptyState
                  title="No Event History"
                  description="This member has not been assigned to any event rosters yet."
                />
              ) : (
                <div className="border border-border rounded-panel overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-muted border-b border-border text-content-secondary uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Event Name</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Responsibility</th>
                        <th className="py-2.5 px-3">Host Club</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-content-primary">
                      {eventHistory.map((evt) => (
                        <tr key={evt.eventId} className="hover:bg-surface-hover">
                          <td className="py-2.5 px-3 font-semibold">{evt.eventName}</td>
                          <td className="py-2.5 px-3 text-content-secondary">{formatDate(evt.eventDate)}</td>
                          <td className="py-2.5 px-3 font-medium text-primary">{evt.responsibility}</td>
                          <td className="py-2.5 px-3 text-content-secondary">{evt.clubName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Assigned Tasks */}
          {activeTab === 'tasks' && (
            <div>
              {tasks.length === 0 ? (
                <EmptyState
                  title="No Assigned Tasks"
                  description="This member currently has no assigned event tasks."
                />
              ) : (
                <div className="border border-border rounded-panel overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-muted border-b border-border text-content-secondary uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Task Description</th>
                        <th className="py-2.5 px-3">Event</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Deadline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-content-primary">
                      {tasks.map((t) => (
                        <tr key={t.taskId} className="hover:bg-surface-hover">
                          <td className="py-2.5 px-3 font-medium max-w-xs truncate">{t.description}</td>
                          <td className="py-2.5 px-3 text-content-secondary">{t.eventName}</td>
                          <td className="py-2.5 px-3">{getTaskStatusBadge(t.taskStatus)}</td>
                          <td className="py-2.5 px-3 text-content-secondary">{formatDate(t.deadline)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default MemberProfileModal;
