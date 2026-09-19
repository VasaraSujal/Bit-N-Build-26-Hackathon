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
  Edit2
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

export const Volunteers = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClubAdmin = user?.role === 'CLUB_ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'directory'; // 'directory' | 'clubs' | 'events'

  // Data State
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [clubMembersMap, setClubMembersMap] = useState({}); // { [clubId]: members[] }
  const [eventVolunteersMap, setEventVolunteersMap] = useState({}); // { [eventId]: volunteers[] }
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClubFilter, setSelectedClubFilter] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');

  // Modals State
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
      // 1. Fetch Clubs & Events
      const [clubsRes, eventsRes] = await Promise.all([
        api.get('clubs').catch(() => ({ data: { clubs: [] } })),
        api.get('events').catch(() => ({ data: { events: [] } }))
      ]);

      const loadedClubs = clubsRes.data?.clubs || [];
      const loadedEvents = eventsRes.data?.events || [];
      setClubs(loadedClubs);
      setEvents(loadedEvents);

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

  // Flattened Unique Volunteers across all clubs
  const allVolunteers = useMemo(() => {
    const list = [];
    const seenIds = new Set();

    Object.entries(clubMembersMap).forEach(([clubId, members]) => {
      const targetClub = clubs.find((c) => c.id === clubId);
      members.forEach((m) => {
        if (m.role === 'VOLUNTEER') {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            list.push({
              ...m,
              clubId,
              clubName: targetClub ? targetClub.name : 'Unknown Club'
            });
          }
        }
      });
    });

    return list;
  }, [clubMembersMap, clubs]);

  // Filtered Volunteers for Directory Tab
  const filteredVolunteers = useMemo(() => {
    return allVolunteers.filter((v) => {
      const matchesSearch =
        !searchQuery ||
        v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClub =
        !selectedClubFilter || v.clubId === selectedClubFilter;

      return matchesSearch && matchesClub;
    });
  }, [allVolunteers, searchQuery, selectedClubFilter]);

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
  const totalVolunteersCount = allVolunteers.length;
  const totalClubsWithVolunteers = Object.keys(clubMembersMap).filter(
    (cId) => (clubMembersMap[cId] || []).filter((m) => m.role === 'VOLUNTEER').length > 0
  ).length;
  const totalEventDeploymentsCount = Object.values(eventVolunteersMap).reduce(
    (acc, vols) => acc + vols.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary" />
            Volunteer Operations
          </h1>
          <p className="text-xs sm:text-sm text-content-secondary mt-1">
            Centralized directory of student volunteers, club allocations, and event deployments.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2.5">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-content-secondary uppercase tracking-wider">
              Total Volunteers
            </p>
            <p className="text-lg sm:text-xl font-bold text-content-primary mt-0.5">
              {isLoading ? '...' : totalVolunteersCount}
            </p>
          </div>
        </Card>

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
          <div className="w-10 h-10 rounded-lg bg-warning-subtle text-warning flex items-center justify-center shrink-0">
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

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-content-secondary uppercase tracking-wider">
              Active Events
            </p>
            <p className="text-lg sm:text-xl font-bold text-content-primary mt-0.5">
              {isLoading ? '...' : events.length}
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
          All Volunteers Directory
          <span className="px-2 py-0.2 rounded-full text-xs bg-surface-muted text-content-secondary">
            {allVolunteers.length}
          </span>
        </button>

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
          <LoadingState message="Loading volunteer rosters and deployments..." />
        </div>
      )}

      {error && !isLoading && (
        <ErrorState
          title="Failed to load volunteers"
          message={error}
          onRetry={fetchData}
        />
      )}

      {/* TAB 1: All Volunteers Directory */}
      {!isLoading && !error && activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Search & Club Filter */}
          <div className="bg-surface border border-border rounded-panel p-4 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80 relative">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-content-muted" />}
              />
            </div>

            <div className="w-full sm:w-64">
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

          {/* Volunteers Table */}
          {filteredVolunteers.length === 0 ? (
            <EmptyState
              title="No volunteers found"
              description="No registered student volunteers match the selected filter criteria."
              actionLabel={isSuperAdmin ? 'Assign Volunteer to Club' : undefined}
              onAction={
                isSuperAdmin
                  ? () => {
                      setSelectedVolunteerForClub(null);
                      setIsAssignClubModalOpen(true);
                    }
                  : undefined
              }
            />
          ) : (
            <div className="bg-surface border border-border rounded-panel overflow-hidden shadow-subtle">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-surface-muted border-b border-border text-content-secondary font-semibold">
                    <tr>
                      <th className="py-3 px-4">Volunteer Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Assigned Club</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredVolunteers.map((v) => (
                      <tr key={v.id} className="hover:bg-surface-muted/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-content-primary">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold text-xs">
                              {v.name ? v.name.charAt(0).toUpperCase() : 'V'}
                            </div>
                            <span>{v.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-content-secondary">{v.email}</td>
                        <td className="py-3.5 px-4">
                          <Link
                            to={`/app/clubs/${v.clubId}`}
                            className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            {v.clubName}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="neutral" size="sm">
                            VOLUNTEER
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={v.is_active ? 'success' : 'danger'} size="sm">
                            {v.is_active ? 'Active' : 'Deactivated'}
                          </Badge>
                        </td>
                        {isSuperAdmin && (
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedVolunteerForClub(v);
                                  setIsAssignClubModalOpen(true);
                                }}
                              >
                                Reassign
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger hover:bg-danger-subtle"
                                onClick={() => {
                                  setVolunteerToRemoveFromClub(v);
                                  setRemoveClubName(v.clubName);
                                  setIsRemoveClubModalOpen(true);
                                }}
                              >
                                Unassign
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Club Rosters & Allocations */}
      {!isLoading && !error && activeTab === 'clubs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clubs.map((c) => {
            const members = clubMembersMap[c.id] || [];
            const volunteers = members.filter((m) => m.role === 'VOLUNTEER');
            const admin = members.find((m) => m.role === 'CLUB_ADMIN');

            return (
              <Card key={c.id} className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <h3 className="text-base font-bold text-content-primary">
                        {c.name}
                      </h3>
                      <Badge variant={c.isActive ? 'success' : 'neutral'} size="sm">
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-content-secondary line-clamp-2">
                      {c.description || 'No description provided.'}
                    </p>
                  </div>

                  <Link
                    to={`/app/clubs/${c.id}`}
                    className="p-1.5 text-content-muted hover:text-primary hover:bg-surface-muted rounded-md transition-colors shrink-0"
                    title="View Club Details"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>

                {/* Admin info */}
                <div className="p-2.5 bg-surface-muted rounded-md text-xs flex items-center justify-between border border-border">
                  <span className="text-content-secondary">Club Lead:</span>
                  <span className="font-semibold text-content-primary">
                    {admin ? admin.name : 'No Administrator Assigned'}
                  </span>
                </div>

                {/* Volunteers List Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-content-secondary">
                    <span>Enrolled Volunteers ({volunteers.length})</span>
                    {isSuperAdmin && (
                      <button
                        onClick={() => {
                          setSelectedVolunteerForClub({ clubId: c.id });
                          setIsAssignClubModalOpen(true);
                        }}
                        className="text-primary hover:underline flex items-center gap-1 font-medium text-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add Member
                      </button>
                    )}
                  </div>

                  {volunteers.length === 0 ? (
                    <p className="text-xs text-content-muted italic py-2">
                      No volunteers assigned to this club yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {volunteers.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between p-2 rounded-md bg-surface border border-border text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-content-primary truncate">
                              {v.name}
                            </p>
                            <p className="text-[11px] text-content-secondary truncate">
                              {v.email}
                            </p>
                          </div>

                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                setVolunteerToRemoveFromClub({ ...v, clubId: c.id });
                                setRemoveClubName(c.name);
                                setIsRemoveClubModalOpen(true);
                              }}
                              className="text-danger hover:bg-danger-subtle p-1 rounded transition-colors"
                              title="Remove from Club"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* TAB 3: Event Deployments & Roster */}
      {!isLoading && !error && activeTab === 'events' && (
        <div className="space-y-5">
          {/* Event Selector Header */}
          <div className="bg-surface border border-border rounded-panel p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-content-primary shrink-0">
                Target Event:
              </span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="px-3 py-1.5 text-xs sm:text-sm bg-surface border border-border rounded-md font-semibold text-content-primary focus:outline-none focus:border-primary max-w-xs sm:max-w-md truncate"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} ({evt.status})
                  </option>
                ))}
              </select>
            </div>

            {activeEvent && (
              <div className="flex items-center gap-2">
                {(isSuperAdmin || isClubAdmin) && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<UserPlus className="w-4 h-4" />}
                    onClick={() => setIsAddEventVolModalOpen(true)}
                  >
                    Assign Volunteer to Event
                  </Button>
                )}
                <Link
                  to={`/app/events/${activeEvent.id}?tab=volunteers`}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 pl-2"
                >
                  View Event Space
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Event Volunteer Cards List */}
          {activeEventVolunteers.length === 0 ? (
            <EmptyState
              title="No volunteers assigned to this event"
              description="Assign club members to this event with designated operational responsibilities (e.g., Registration, Stage Management, Technical Support)."
              actionLabel="Assign Volunteer to Event"
              onAction={() => setIsAddEventVolModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEventVolunteers.map((vol) => (
                <Card key={vol.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {vol.userName ? vol.userName.charAt(0).toUpperCase() : 'V'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-content-primary truncate">
                          {vol.userName}
                        </h4>
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

                  {(isSuperAdmin || isClubAdmin) && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingEventVolunteer(vol)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-subtle"
                        onClick={() => setRemovingEventVolunteer(vol)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Assign to Club (Super Admin) */}
      <AssignClubVolunteerModal
        isOpen={isAssignClubModalOpen}
        onClose={() => {
          setIsAssignClubModalOpen(false);
          setSelectedVolunteerForClub(null);
        }}
        clubs={clubs}
        volunteer={selectedVolunteerForClub}
        onSuccess={fetchData}
      />

      {/* MODAL 2: Remove from Club (Super Admin) */}
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

      {/* MODAL 3: Assign to Event */}
      {activeEvent && (
        <AddVolunteerModal
          isOpen={isAddEventVolModalOpen}
          onClose={() => setIsAddEventVolModalOpen(false)}
          eventId={activeEvent.id}
          availableMembers={availableClubMembersForActiveEvent}
          onSuccess={fetchData}
        />
      )}

      {/* MODAL 4: Edit Event Volunteer */}
      {activeEvent && editingEventVolunteer && (
        <EditVolunteerModal
          isOpen={Boolean(editingEventVolunteer)}
          onClose={() => setEditingEventVolunteer(null)}
          eventId={activeEvent.id}
          volunteer={editingEventVolunteer}
          onSuccess={fetchData}
        />
      )}

      {/* MODAL 5: Remove Event Volunteer */}
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
