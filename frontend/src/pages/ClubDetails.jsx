import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  Users,
  ShieldCheck,
  UserCheck,
  Calendar,
  ArrowLeft,
  Edit2,
  Power,
  Plus,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import { ClubLogo } from '../components/clubs/ClubLogo';
import EditClubModal from '../components/clubs/EditClubModal';
import ClubStatusModal from '../components/clubs/ClubStatusModal';
import ChangeAdminModal from '../components/clubs/ChangeAdminModal';
import CreateEventModal from '../components/events/CreateEventModal';

export const ClubDetails = () => {
  const { clubId } = useParams();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAssignedClubAdmin = user?.role === 'CLUB_ADMIN' && user?.clubId === clubId;
  const canManageClub = isSuperAdmin;
  const canCreateEvent = isSuperAdmin || isAssignedClubAdmin;

  const [club, setClub] = useState(null);
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'events'

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isChangeAdminOpen, setIsChangeAdminOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  const fetchClubData = useCallback(async () => {
    if (!clubId) return;
    setIsLoading(true);
    setError(null);

    try {
      // Parallel requests for club details, summary, members, and events
      const [clubRes, summaryRes, membersRes, eventsRes] = await Promise.all([
        api.get(`clubs/${clubId}`),
        api.get(`clubs/${clubId}/summary`).catch(() => ({ data: {} })),
        api.get(`clubs/${clubId}/members`).catch(() => ({ data: { members: [] } })),
        api.get(`clubs/${clubId}/events`).catch(() => ({ data: { events: [] } }))
      ]);

      setClub(clubRes.data?.club || null);
      setSummary(summaryRes.data || null);
      setMembers(membersRes.data?.members || []);
      setEvents(eventsRes.data?.events || []);
    } catch (err) {
      setError(err.message || 'Unable to load club details.');
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);

  const currentAdmin = members.find((m) => m.role === 'CLUB_ADMIN' && m.isActive);

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

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'upcoming':
        return 'info';
      case 'ongoing':
        return 'warning';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 bg-surface border border-border rounded-panel flex items-center justify-center max-w-6xl">
        <LoadingState message="Loading club details and records..." />
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="max-w-6xl space-y-4">
        {isSuperAdmin && (
          <Link to="/app/clubs" className="inline-flex items-center gap-1.5 text-xs text-content-secondary hover:text-content-primary">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Clubs
          </Link>
        )}
        <ErrorState
          title="Club Not Found"
          message={error || 'The requested club could not be loaded.'}
          onRetry={fetchClubData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Breadcrumb Navigation */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2 text-xs text-content-secondary">
          <Link to="/app/clubs" className="hover:text-content-primary flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Clubs
          </Link>
          <span>/</span>
          <span className="text-content-primary font-medium truncate">{club.name}</span>
        </div>
      )}

      {/* Club Inactive Banner */}
      {!club.isActive && (
        <div className="p-3.5 bg-warning-subtle border border-warning-border rounded-panel flex items-center gap-3 text-warning-text">
          <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
          <div className="text-xs sm:text-sm">
            <strong>Club is Inactive:</strong> New events cannot be created for an inactive club. Existing data remains read-only for operations.
          </div>
        </div>
      )}

      {/* Main Club Banner Card */}
      <div className="bg-surface border border-border rounded-panel p-5 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <ClubLogo logoUrl={club.logoUrl} name={club.name} size="xl" />

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
                {club.name}
              </h1>
              <Badge
                variant={club.isActive ? 'success' : 'neutral'}
                size="sm"
                icon={
                  club.isActive ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )
                }
              >
                {club.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-content-secondary max-w-2xl">
              {club.description || <span className="italic text-content-muted">No description provided.</span>}
            </p>
            <div className="text-[11px] text-content-muted flex items-center gap-3 pt-1">
              <span>Created {formatDate(club.createdAt)}</span>
              <span>•</span>
              <span className="font-mono text-[10px]">ID: {club.id}</span>
            </div>
          </div>
        </div>

        {/* Super Admin Control Actions */}
        {canManageClub && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => setIsEditOpen(true)}
            >
              Edit Club
            </Button>
            <Button
              variant={club.isActive ? 'ghost' : 'secondary'}
              size="sm"
              className={club.isActive ? 'text-danger hover:bg-danger-subtle' : ''}
              icon={<Power className="w-3.5 h-3.5" />}
              onClick={() => setIsStatusOpen(true)}
            >
              {club.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        )}
      </div>

      {/* Operational Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-surface">
          <div className="flex items-center justify-between text-content-secondary mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Members</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-content-primary">
            {summary?.memberCount ?? members.length}
          </div>
          <div className="text-[11px] text-content-muted mt-1">Active roster participants</div>
        </Card>

        <Card className="p-4 bg-surface">
          <div className="flex items-center justify-between text-content-secondary mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Club Admins</span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-content-primary">
            {summary?.clubAdminCount ?? (currentAdmin ? 1 : 0)}
          </div>
          <div className="text-[11px] text-content-muted mt-1">Operational leadership</div>
        </Card>

        <Card className="p-4 bg-surface">
          <div className="flex items-center justify-between text-content-secondary mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Volunteers</span>
            <UserCheck className="w-4 h-4 text-success" />
          </div>
          <div className="text-2xl font-bold text-content-primary">
            {summary?.volunteerCount ?? members.filter((m) => m.role === 'VOLUNTEER').length}
          </div>
          <div className="text-[11px] text-content-muted mt-1">Event workforce</div>
        </Card>

        <Card className="p-4 bg-surface">
          <div className="flex items-center justify-between text-content-secondary mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Club Events</span>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-content-primary">
            {events.length}
          </div>
          <div className="text-[11px] text-content-muted mt-1">Total planned & past</div>
        </Card>
      </div>

      {/* Administrator Card */}
      <Card className="p-4 sm:p-5 bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-content-primary">
                Club Administrator
              </h3>
            </div>
            {currentAdmin ? (
              <div className="text-xs sm:text-sm text-content-secondary flex flex-wrap items-center gap-2 pt-0.5">
                <strong className="text-content-primary">{currentAdmin.name}</strong>
                <span>•</span>
                <span className="flex items-center gap-1 text-content-secondary">
                  <Mail className="w-3.5 h-3.5" />
                  {currentAdmin.email}
                </span>
                <Badge variant="info" size="sm">
                  Active Admin
                </Badge>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-content-muted italic">
                No active club administrator currently assigned.
              </p>
            )}
          </div>

          {canManageClub && (
            <Button
              variant="secondary"
              size="sm"
              className="self-start sm:self-auto text-xs"
              onClick={() => setIsChangeAdminOpen(true)}
            >
              {currentAdmin ? 'Change Administrator' : 'Assign Administrator'}
            </Button>
          )}
        </div>
      </Card>

      {/* Tabs Navigation: Members & Events */}
      <div className="space-y-4">
        <div className="border-b border-border flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'members'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-content-secondary hover:text-content-primary'
              }`}
            >
              <Users className="w-4 h-4" />
              Club Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'events'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-content-secondary hover:text-content-primary'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Club Events ({events.length})
            </button>
          </div>

          {activeTab === 'events' && canCreateEvent && club.isActive && (
            <div className="pb-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsCreateEventOpen(true)}
              >
                Create Event
              </Button>
            </div>
          )}
        </div>

        {/* Tab 1: Members */}
        {activeTab === 'members' && (
          <div>
            {members.length === 0 ? (
              <EmptyState
                icon={<Users className="w-6 h-6 text-content-secondary" />}
                title="No members yet"
                description="This club does not have any registered members or volunteers assigned."
              />
            ) : (
              <div className="bg-surface border border-border rounded-panel shadow-subtle overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted/60 text-content-secondary font-semibold">
                        <th className="py-3 px-4">Member Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-surface-muted/30">
                          <td className="py-3 px-4 font-medium text-content-primary">
                            {member.name}
                          </td>
                          <td className="py-3 px-4 text-content-secondary font-mono text-xs">
                            {member.email}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={member.role === 'CLUB_ADMIN' ? 'info' : 'neutral'}
                              size="sm"
                            >
                              {member.role === 'CLUB_ADMIN' ? 'Club Admin' : 'Volunteer'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={member.isActive ? 'success' : 'danger'}
                              size="sm"
                            >
                              {member.isActive ? 'Active' : 'Deactivated'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-content-secondary whitespace-nowrap">
                            {formatDate(member.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Member Cards */}
                <div className="sm:hidden divide-y divide-border">
                  {members.map((member) => (
                    <div key={member.id} className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-content-primary">
                          {member.name}
                        </span>
                        <Badge
                          variant={member.role === 'CLUB_ADMIN' ? 'info' : 'neutral'}
                          size="sm"
                        >
                          {member.role === 'CLUB_ADMIN' ? 'Club Admin' : 'Volunteer'}
                        </Badge>
                      </div>
                      <div className="text-xs text-content-secondary flex items-center justify-between">
                        <span>{member.email}</span>
                        <span className="text-[11px] text-content-muted">{formatDate(member.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Events */}
        {activeTab === 'events' && (
          <div>
            {events.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-6 h-6 text-content-secondary" />}
                title="No events for this club yet"
                description={
                  club.isActive
                    ? 'Start organizing club operations by scheduling the first event.'
                    : 'No events have been organized for this club.'
                }
                action={
                  canCreateEvent && club.isActive && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => setIsCreateEventOpen(true)}
                    >
                      Create First Event
                    </Button>
                  )
                }
              />
            ) : (
              <div className="bg-surface border border-border rounded-panel shadow-subtle overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted/60 text-content-secondary font-semibold">
                        <th className="py-3 px-4">Event Name</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {events.map((evt) => (
                        <tr key={evt.id} className="hover:bg-surface-muted/30">
                          <td className="py-3.5 px-4 font-semibold text-content-primary">
                            <Link
                              to={`/app/events/${evt.id}`}
                              className="hover:text-primary hover:underline"
                            >
                              {evt.name}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 text-content-secondary whitespace-nowrap">
                            {formatDate(evt.eventDate)}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={getStatusBadgeVariant(evt.status)}
                              size="sm"
                            >
                              {evt.status ? evt.status.charAt(0).toUpperCase() + evt.status.slice(1) : 'Unknown'}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-content-secondary max-w-xs truncate">
                            {evt.description || <span className="italic text-content-muted">None</span>}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Link to={`/app/events/${evt.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                icon={<ExternalLink className="w-3.5 h-3.5" />}
                              >
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden divide-y divide-border">
                  {events.map((evt) => (
                    <div key={evt.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/app/events/${evt.id}`}
                          className="font-bold text-sm text-content-primary hover:text-primary"
                        >
                          {evt.name}
                        </Link>
                        <Badge
                          variant={getStatusBadgeVariant(evt.status)}
                          size="sm"
                        >
                          {evt.status ? evt.status.charAt(0).toUpperCase() + evt.status.slice(1) : 'Unknown'}
                        </Badge>
                      </div>
                      <div className="text-xs text-content-secondary flex items-center justify-between">
                        <span>{formatDate(evt.eventDate)}</span>
                        <Link to={`/app/events/${evt.id}`}>
                          <Button variant="secondary" size="sm" className="h-7 text-xs px-2">
                            View Event
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Club Modal */}
      <EditClubModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        club={club}
        onSuccess={(updated) => {
          setClub((prev) => ({ ...prev, ...updated }));
        }}
      />

      {/* Club Status Modal */}
      <ClubStatusModal
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        club={club}
        onSuccess={(updated) => {
          setClub((prev) => ({ ...prev, ...updated }));
        }}
      />

      {/* Change Admin Modal */}
      <ChangeAdminModal
        isOpen={isChangeAdminOpen}
        onClose={() => setIsChangeAdminOpen(false)}
        club={club}
        members={members}
        onSuccess={() => {
          fetchClubData();
        }}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        preselectedClubId={club.id}
        onSuccess={() => {
          fetchClubData();
        }}
      />
    </div>
  );
};

export default ClubDetails;
