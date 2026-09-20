import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Users,
  Building2,
  Calendar,
  Search,
  Filter,
  UserPlus,
  UserMinus,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Phone,
  Briefcase,
  AlertCircle,
  Layers,
  Edit2,
  Trash2,
  Eye
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import AssignClubVolunteerModal from '../components/volunteers/AssignClubVolunteerModal';
import RemoveClubVolunteerModal from '../components/volunteers/RemoveClubVolunteerModal';
import AddVolunteerModal from '../components/volunteers/AddVolunteerModal';
import EditVolunteerModal from '../components/volunteers/EditVolunteerModal';
import RemoveVolunteerModal from '../components/volunteers/RemoveVolunteerModal';
import CreateMemberModal from '../components/members/CreateMemberModal';
import MemberProfileModal from '../components/members/MemberProfileModal';
import EditMemberModal from '../components/members/EditMemberModal';
import DeleteMemberModal from '../components/members/DeleteMemberModal';

export const Volunteers = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClubAdmin = user?.role === 'CLUB_ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'directory'; // 'directory' | 'unassigned' | 'clubs' | 'events'

  // Data State
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [allCampusMembers, setAllCampusMembers] = useState([]);
  const [unassignedUsers, setUnassignedUsers] = useState([]);
  const [clubMembersMap, setClubMembersMap] = useState({}); // { [clubId]: members[] }
  const [eventVolunteersMap, setEventVolunteersMap] = useState({}); // { [eventId]: volunteers[] }
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClubFilter, setSelectedClubFilter] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all'); // 'all' | 'assigned' | 'unassigned'
  const [selectedEventId, setSelectedEventId] = useState('');

  // Modals State
  const [isCreateMemberModalOpen, setIsCreateMemberModalOpen] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);

  const [isAssignClubModalOpen, setIsAssignClubModalOpen] = useState(false);
  const [selectedVolunteerForClub, setSelectedVolunteerForClub] = useState(null);

  const [isRemoveClubModalOpen, setIsRemoveClubModalOpen] = useState(false);
  const [volunteerToRemoveFromClub, setVolunteerToRemoveFromClub] = useState(null);
  const [removeClubName, setRemoveClubName] = useState('');

  // Event Volunteer Modals State
  const [isAddEventVolModalOpen, setIsAddEventVolModalOpen] = useState(false);
  const [editingEventVolunteer, setEditingEventVolunteer] = useState(null);
  const [removingEventVolunteer, setRemovingEventVolunteer] = useState(null);

  // Main Data Fetcher
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Clubs, Events, All Users & Unassigned Users
      const [clubsRes, eventsRes, unassignedRes, allUsersRes] = await Promise.all([
        api.get('clubs').catch(() => ({ data: { clubs: [] } })),
        api.get('events').catch(() => ({ data: { events: [] } })),
        api.get('users?unassigned=true').catch(() => ({ data: { users: [] } })),
        api.get('users').catch(() => ({ data: { users: [] } }))
      ]);

      const loadedClubs = clubsRes.data?.clubs || [];
      const loadedEvents = eventsRes.data?.events || [];
      setClubs(loadedClubs);
      setEvents(loadedEvents);
      setUnassignedUsers(unassignedRes.data?.users || []);
      setAllCampusMembers(allUsersRes.data?.users || []);

      if (loadedEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(loadedEvents[0].id);
      }

      // 2. Fetch Members for all clubs
      const membersPromises = loadedClubs.map(async (c) => {
        try {
          const res = await api.get(`clubs/${c.id}/members`);
          return { clubId: c.id, members: res.data?.members || [] };
        } catch {
          return { clubId: c.id, members: [] };
        }
      });

      const membersResults = await Promise.all(membersPromises);
      const newClubMembersMap = {};
      membersResults.forEach((r) => {
        newClubMembersMap[r.clubId] = r.members;
      });
      setClubMembersMap(newClubMembersMap);

      // 3. Fetch Event Volunteers for manageable events
      const eventVolsPromises = loadedEvents.map(async (evt) => {
        try {
          const res = await api.get(`events/${evt.id}/volunteers`);
          return { eventId: evt.id, volunteers: res.data?.volunteers || [] };
        } catch {
          return { eventId: evt.id, volunteers: [] };
        }
      });

      const eventVolsResults = await Promise.all(eventVolsPromises);
      const newEventVolsMap = {};
      eventVolsResults.forEach((r) => {
        newEventVolsMap[r.eventId] = r.volunteers;
      });
      setEventVolunteersMap(newEventVolsMap);
    } catch (err) {
      setError(err.message || 'Failed to load volunteer records.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  // Filtered Campus Members for Tab 1 ("All Campus Members")
  const filteredCampusMembers = useMemo(() => {
    return allCampusMembers.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q);

      const isAssigned = Boolean(m.clubId || m.club_id);
      const matchesAssignment =
        assignmentStatusFilter === 'all' ||
        (assignmentStatusFilter === 'assigned' && isAssigned) ||
        (assignmentStatusFilter === 'unassigned' && !isAssigned);

      const memberClubId = m.clubId || m.club_id;
      const matchesClub =
        !selectedClubFilter || memberClubId === selectedClubFilter;

      return matchesSearch && matchesAssignment && matchesClub;
    });
  }, [allCampusMembers, searchQuery, assignmentStatusFilter, selectedClubFilter]);

  // Selected event object & its volunteers
  const activeEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  const activeEventVolunteers = useMemo(() => {
    return eventVolunteersMap[selectedEventId] || [];
  }, [eventVolunteersMap, selectedEventId]);

  // Available club members for event assignment dropdown
  const availableClubMembersForActiveEvent = useMemo(() => {
    if (!activeEvent || !activeEvent.clubId) return [];
    return clubMembersMap[activeEvent.clubId] || [];
  }, [activeEvent, clubMembersMap]);

  // Quick Stats
  const totalVolunteersCount = allCampusMembers.length;
  const totalClubsWithVolunteers = Object.keys(clubMembersMap).filter(
    (cId) => (clubMembersMap[cId] || []).length > 0
  ).length;
  const totalEventDeploymentsCount = Object.values(eventVolunteersMap).reduce(
    (acc, vols) => acc + vols.length,
    0
  );

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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary" />
            Volunteer & Member Operations
          </h1>
          <p className="text-xs sm:text-sm text-content-secondary mt-1">
            Centralized directory of student campus members, club allocations, unassigned pool, and event rosters.
          </p>
        </div>

        {(isSuperAdmin || isClubAdmin) && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsCreateMemberModalOpen(true)}
            >
              Create New Member
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => {
                setSelectedVolunteerForClub(null);
                setIsAssignClubModalOpen(true);
              }}
            >
              Assign to Club
            </Button>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-content-secondary uppercase tracking-wider">
              {isSuperAdmin ? 'Total Campus Members' : 'Club Roster Members'}
            </p>
            <p className="text-lg sm:text-xl font-bold text-content-primary mt-0.5">
              {isLoading ? '...' : totalVolunteersCount}
            </p>
          </div>
        </Card>

        {isSuperAdmin && (
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-subtle text-warning flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-content-secondary uppercase tracking-wider">
                Unassigned Pool
              </p>
              <p className="text-lg sm:text-xl font-bold text-content-primary mt-0.5">
                {isLoading ? '...' : unassignedUsers.length}
              </p>
            </div>
          </Card>
        )}

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success-subtle text-success flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-content-secondary uppercase tracking-wider">
              Active Club Rosters
            </p>
            <p className="text-lg sm:text-xl font-bold text-content-primary mt-0.5">
              {isLoading ? '...' : `${totalClubsWithVolunteers} / ${clubs.length}`}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-content-secondary uppercase tracking-wider">
              Event Deployments
            </p>
            <p className="text-lg sm:text-xl font-bold text-content-primary mt-0.5">
              {isLoading ? '...' : totalEventDeploymentsCount}
            </p>
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border gap-6 text-sm font-semibold">
        <button
          onClick={() => handleTabChange('directory')}
          className={`pb-3 transition-colors flex items-center gap-2 relative ${
            activeTab === 'directory'
              ? 'text-primary border-b-2 border-primary font-bold'
              : 'text-content-secondary hover:text-content-primary'
          }`}
        >
          <Users className="w-4 h-4" />
          {isSuperAdmin ? 'All Campus Members' : 'Club Roster Members'}
          <span className="px-2 py-0.2 rounded-full text-xs bg-surface-muted text-content-secondary">
            {allCampusMembers.length}
          </span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => handleTabChange('unassigned')}
            className={`pb-3 transition-colors flex items-center gap-2 relative ${
              activeTab === 'unassigned'
                ? 'text-primary border-b-2 border-primary font-bold'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            <Layers className="w-4 h-4" />
            Unassigned Pool Directory
            <span className={`px-2 py-0.2 rounded-full text-xs ${
              unassignedUsers.length > 0 ? 'bg-warning-subtle text-warning font-semibold' : 'bg-surface-muted text-content-secondary'
            }`}>
              {unassignedUsers.length}
            </span>
          </button>
        )}

        <button
          onClick={() => handleTabChange('clubs')}
          className={`pb-3 transition-colors flex items-center gap-2 relative ${
            activeTab === 'clubs'
              ? 'text-primary border-b-2 border-primary font-bold'
              : 'text-content-secondary hover:text-content-primary'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Club Rosters
          <span className="px-2 py-0.2 rounded-full text-xs bg-surface-muted text-content-secondary">
            {clubs.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('events')}
          className={`pb-3 transition-colors flex items-center gap-2 relative ${
            activeTab === 'events'
              ? 'text-primary border-b-2 border-primary font-bold'
              : 'text-content-secondary hover:text-content-primary'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Event Deployments
        </button>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="py-16 bg-surface border border-border rounded-panel">
          <LoadingState message="Loading member rosters and deployments..." />
        </div>
      )}

      {error && !isLoading && (
        <ErrorState
          title="Failed to load members"
          message={error}
          onRetry={fetchData}
        />
      )}

      {/* TAB 1: All Campus Members Directory (Assigned & Unassigned) */}
      {!isLoading && !error && activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Search, Status & Club Filter */}
          <div className="bg-surface border border-border rounded-panel p-4 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-72 relative">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-content-muted" />}
              />
            </div>

            {isSuperAdmin && (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="w-full sm:w-48">
                  <Select
                    value={assignmentStatusFilter}
                    onChange={(e) => setAssignmentStatusFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Members (Both)' },
                      { value: 'assigned', label: 'Assigned Only' },
                      { value: 'unassigned', label: 'Unassigned Only' }
                    ]}
                  />
                </div>

                <div className="w-full sm:w-56">
                  <Select
                    value={selectedClubFilter}
                    onChange={(e) => setSelectedClubFilter(e.target.value)}
                    options={[
                      { value: '', label: 'All Clubs' },
                      ...clubs.map((c) => ({ value: c.id, label: c.name }))
                    ]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Members Table */}
          {filteredCampusMembers.length === 0 ? (
            <EmptyState
              title="No members match criteria"
              description="No registered campus members match your search and filter parameters."
              actionLabel={isSuperAdmin || isClubAdmin ? 'Create New Member' : undefined}
              onAction={
                (isSuperAdmin || isClubAdmin)
                  ? () => setIsCreateMemberModalOpen(true)
                  : undefined
              }
            />
          ) : (
            <div className="bg-surface border border-border rounded-panel overflow-hidden shadow-subtle">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-surface-muted border-b border-border text-content-secondary font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Member Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Assignment Status & Club</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-content-primary">
                    {filteredCampusMembers.map((m) => {
                      const isAssigned = Boolean(m.clubId || m.club_id || m.clubName);
                      const memberClubName = m.clubName || (clubs.find(c => c.id === (m.clubId || m.club_id))?.name);

                      return (
                        <tr key={m.id} className="hover:bg-surface-muted/50 transition-colors">
                          <td className="py-3 px-4 font-semibold">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                isAssigned ? 'bg-primary-subtle text-primary' : 'bg-warning-subtle text-warning'
                              }`}>
                                {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
                              </div>
                              <button
                                type="button"
                                className="hover:text-primary hover:underline transition-colors text-left font-semibold"
                                onClick={() => setSelectedProfileUserId(m.id)}
                              >
                                {m.name}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-content-secondary">{m.email}</td>
                          <td className="py-3 px-4">
                            {isAssigned ? (
                              <Badge variant="info" size="sm" icon={<Building2 className="w-3 h-3" />}>
                                Assigned ({memberClubName || 'Club'})
                              </Badge>
                            ) : (
                              <Badge variant="warning" size="sm">
                                Unassigned
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={m.role === 'SUPER_ADMIN' ? 'danger' : m.role === 'CLUB_ADMIN' ? 'info' : 'neutral'} size="sm">
                              {m.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={m.isActive !== false && m.is_active !== false ? 'success' : 'danger'} size="sm">
                              {m.isActive !== false && m.is_active !== false ? 'Active' : 'Deactivated'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="View 360° Profile"
                                onClick={() => setSelectedProfileUserId(m.id)}
                              >
                                <Eye className="w-5 h-5 text-content-secondary" />
                              </Button>

                              {(isSuperAdmin || isClubAdmin) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Edit Member Details"
                                  onClick={() => setEditingMember(m)}
                                >
                                  <Edit2 className="w-5 h-5 text-content-secondary" />
                                </Button>
                              )}

                              {(isSuperAdmin || isClubAdmin) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title={isAssigned ? 'Transfer / Reassign Club' : 'Assign to Club'}
                                  onClick={() => {
                                    setSelectedVolunteerForClub(m);
                                    setIsAssignClubModalOpen(true);
                                  }}
                                >
                                  <UserPlus className="w-5 h-5 text-primary" />
                                </Button>
                              )}

                              {(isSuperAdmin || isClubAdmin) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Delete Member"
                                  className="text-danger hover:bg-danger-subtle"
                                  onClick={() => setDeletingMember(m)}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Unassigned Directory */}
      {!isLoading && !error && activeTab === 'unassigned' && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-panel p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-content-primary flex items-center gap-2">
                <Layers className="w-4 h-4 text-warning" />
                Unassigned Members Directory
              </h3>
              <p className="text-xs text-content-secondary mt-0.5">
                Students registered or provisioned on the platform who have not yet been assigned to any club roster.
              </p>
            </div>
            {(isSuperAdmin || isClubAdmin) && (
              <Button
                variant="primary"
                size="sm"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={() => setIsCreateMemberModalOpen(true)}
              >
                Provision New Member
              </Button>
            )}
          </div>

          {unassignedUsers.length === 0 ? (
            <EmptyState
              title="No unassigned members"
              description="All registered student members have been assigned to club rosters."
              actionLabel={isSuperAdmin || isClubAdmin ? 'Provision New Member' : undefined}
              onAction={
                (isSuperAdmin || isClubAdmin)
                  ? () => setIsCreateMemberModalOpen(true)
                  : undefined
              }
            />
          ) : (
            <div className="bg-surface border border-border rounded-panel overflow-hidden shadow-subtle">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-surface-muted border-b border-border text-content-secondary font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Member Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-content-primary">
                    {unassignedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 px-4 font-semibold flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-warning-subtle text-warning flex items-center justify-center font-bold text-xs">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <button
                            type="button"
                            className="hover:text-primary hover:underline transition-colors text-left"
                            onClick={() => setSelectedProfileUserId(u.id)}
                          >
                            {u.name}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-content-secondary">{u.email}</td>
                        <td className="py-3 px-4">
                          <Badge variant="neutral" size="sm">
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="warning" size="sm">
                            Unassigned
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View Profile"
                              onClick={() => setSelectedProfileUserId(u.id)}
                            >
                              <Eye className="w-5 h-5" />
                            </Button>

                            {(isSuperAdmin || isClubAdmin) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Edit Details"
                                onClick={() => setEditingMember(u)}
                              >
                                <Edit2 className="w-5 h-5" />
                              </Button>
                            )}

                            {(isSuperAdmin || isClubAdmin) && (
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<UserPlus className="w-5 h-5" />}
                                onClick={() => {
                                  setSelectedVolunteerForClub(u);
                                  setIsAssignClubModalOpen(true);
                                }}
                              >
                                Assign to Club
                              </Button>
                            )}

                            {(isSuperAdmin || isClubAdmin) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger hover:bg-danger-subtle"
                                onClick={() => setDeletingMember(u)}
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Club Rosters */}
      {!isLoading && !error && activeTab === 'clubs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {clubs.map((club) => {
              const members = clubMembersMap[club.id] || [];
              const volunteersList = members.filter((m) => m.role === 'VOLUNTEER');
              const admin = members.find((m) => m.role === 'CLUB_ADMIN');

              return (
                <Card key={club.id} className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-subtle text-primary flex items-center justify-center font-bold text-base shrink-0">
                        {club.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-content-primary">
                          <Link to={`/app/clubs/${club.id}`} className="hover:text-primary transition-colors">
                            {club.name}
                          </Link>
                        </h3>
                        <p className="text-xs text-content-secondary mt-0.5">
                          {volunteersList.length} Volunteers · {admin ? `Admin: ${admin.name}` : 'No Admin Assigned'}
                        </p>
                      </div>
                    </div>

                    <Link to={`/app/clubs/${club.id}`}>
                      <Button variant="ghost" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                        View Club
                      </Button>
                    </Link>
                  </div>

                  {volunteersList.length === 0 ? (
                    <div className="p-4 bg-surface-muted border border-border rounded-md text-xs text-content-secondary text-center">
                      No volunteers currently assigned to this club roster.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                        Club Volunteers ({volunteersList.length})
                      </p>
                      <div className="divide-y divide-border border border-border rounded-md overflow-hidden bg-surface">
                        {volunteersList.slice(0, 5).map((v) => (
                          <div key={v.id} className="p-2.5 flex items-center justify-between text-xs">
                            <button
                              type="button"
                              className="font-medium text-content-primary hover:text-primary hover:underline text-left"
                              onClick={() => setSelectedProfileUserId(v.id)}
                            >
                              {v.name}
                            </button>
                            <span className="text-content-secondary text-[11px]">{v.email}</span>
                          </div>
                        ))}
                        {volunteersList.length > 5 && (
                          <div className="p-2 bg-surface-muted text-center text-xs text-content-secondary font-medium">
                            + {volunteersList.length - 5} more volunteers in roster
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Event Deployments */}
      {!isLoading && !error && activeTab === 'events' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Select
                label="Select Event Deployment"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                options={events.map((e) => ({
                  value: e.id,
                  label: `${e.name} (${e.status})`
                }))}
              />
            </div>

            {activeEvent && (isSuperAdmin || isClubAdmin) && (
              <Button
                variant="primary"
                size="sm"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={() => setIsAddEventVolModalOpen(true)}
              >
                Add Volunteer to Event
              </Button>
            )}
          </div>

          {activeEventVolunteers.length === 0 ? (
            <EmptyState
              title="No volunteers assigned to this event"
              description="No volunteers are currently deployed to this event."
              actionLabel={isSuperAdmin || isClubAdmin ? 'Add Volunteer to Event' : undefined}
              onAction={
                isSuperAdmin || isClubAdmin ? () => setIsAddEventVolModalOpen(true) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEventVolunteers.map((vol) => (
                <Card key={vol.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {vol.name ? vol.name.charAt(0).toUpperCase() : 'V'}
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          className="font-bold text-xs text-content-primary hover:text-primary hover:underline text-left truncate block"
                          onClick={() => setSelectedProfileUserId(vol.userId)}
                        >
                          {vol.name}
                        </button>
                        <p className="text-[11px] text-content-secondary truncate">
                          {vol.email}
                        </p>
                      </div>
                    </div>

                    <Badge variant="info" size="sm">
                      Assigned
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs pt-1 border-t border-border/70">
                    <div className="flex items-center gap-2 text-content-secondary">
                      <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-content-primary truncate">
                        {vol.responsibility || 'General Volunteer'}
                      </span>
                    </div>

                    {vol.contact && (
                      <div className="flex items-center gap-2 text-content-secondary">
                        <Phone className="w-3.5 h-3.5 text-content-muted shrink-0" />
                        <span className="truncate">{vol.contact}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Create Member Modal */}
      <CreateMemberModal
        isOpen={isCreateMemberModalOpen}
        onClose={() => setIsCreateMemberModalOpen(false)}
        clubs={clubs}
        currentUserRole={user?.role}
        currentUserClubId={user?.clubId}
        onSuccess={fetchData}
      />

      {/* MODAL 2: Member 360 Profile Modal */}
      <MemberProfileModal
        isOpen={Boolean(selectedProfileUserId)}
        onClose={() => setSelectedProfileUserId(null)}
        userId={selectedProfileUserId}
        onActionSuccess={fetchData}
      />

      {/* MODAL 3: Edit Member Modal */}
      <EditMemberModal
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        member={editingMember}
        clubs={clubs}
        currentUserRole={user?.role}
        onSuccess={fetchData}
      />

      {/* MODAL 4: Delete Member Modal */}
      <DeleteMemberModal
        isOpen={Boolean(deletingMember)}
        onClose={() => setDeletingMember(null)}
        member={deletingMember}
        onSuccess={fetchData}
      />

      {/* MODAL 5: Assign to Club (Super Admin & Club Admin) */}
      <AssignClubVolunteerModal
        isOpen={isAssignClubModalOpen}
        onClose={() => {
          setIsAssignClubModalOpen(false);
          setSelectedVolunteerForClub(null);
        }}
        clubs={clubs}
        volunteer={selectedVolunteerForClub}
        availableMembers={allCampusMembers}
        onSuccess={fetchData}
      />

      {/* MODAL 6: Remove from Club */}
      <RemoveClubVolunteerModal
        isOpen={isRemoveClubModalOpen}
        onClose={() => {
          setIsRemoveClubModalOpen(false);
          setVolunteerToRemoveFromClub(null);
        }}
        volunteer={volunteerToRemoveFromClub}
        clubName={removeClubName}
        onSuccess={fetchData}
      />

      {/* MODAL 7: Assign to Event */}
      {activeEvent && (
        <AddVolunteerModal
          isOpen={isAddEventVolModalOpen}
          onClose={() => setIsAddEventVolModalOpen(false)}
          eventId={activeEvent.id}
          availableMembers={availableClubMembersForActiveEvent}
          onSuccess={fetchData}
        />
      )}

      {/* MODAL 8: Edit Event Volunteer */}
      {activeEvent && editingEventVolunteer && (
        <EditVolunteerModal
          isOpen={Boolean(editingEventVolunteer)}
          onClose={() => setEditingEventVolunteer(null)}
          eventId={activeEvent.id}
          volunteer={editingEventVolunteer}
          onSuccess={fetchData}
        />
      )}

      {/* MODAL 9: Remove Event Volunteer */}
      {activeEvent && removingEventVolunteer && (
        <RemoveVolunteerModal
          isOpen={Boolean(removingEventVolunteer)}
          onClose={() => setRemovingEventVolunteer(null)}
          eventId={activeEvent.id}
          volunteer={removingEventVolunteer}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default Volunteers;
