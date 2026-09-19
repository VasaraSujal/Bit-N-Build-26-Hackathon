import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Search,
  ExternalLink,
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PlayCircle,
  CalendarDays
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import CreateEventModal from '../components/events/CreateEventModal';

const STATUS_FILTERS = [
  { id: 'all', label: 'All Events' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' }
];

export const Events = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClubAdmin = user?.role === 'CLUB_ADMIN';
  const canCreateEvent = isSuperAdmin || isClubAdmin;

  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [userClub, setUserClub] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClubFilter, setSelectedClubFilter] = useState('all');

  // Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = isSuperAdmin && selectedClubFilter !== 'all'
        ? `events?clubId=${selectedClubFilter}`
        : 'events';

      const res = await api.get(endpoint);
      setEvents(res.data?.events || []);

      // If Super Admin, also fetch clubs for club name mapping and filtering
      if (isSuperAdmin) {
        const clubsRes = await api.get('clubs').catch(() => ({ data: { clubs: [] } }));
        setClubs(clubsRes.data?.clubs || []);
      } else if (user?.clubId) {
        // Fetch user's club details to check if active
        const clubRes = await api.get(`clubs/${user.clubId}`).catch(() => ({ data: {} }));
        setUserClub(clubRes.data?.club || null);
      }
    } catch (err) {
      setError(err.message || 'Unable to load events.');
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin, selectedClubFilter, user?.clubId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Map club ID to club name
  const clubNameMap = useMemo(() => {
    const map = {};
    clubs.forEach((c) => {
      map[c.id] = c.name;
    });
    if (userClub) {
      map[userClub.id] = userClub.name;
    }
    return map;
  }, [clubs, userClub]);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesStatus = statusFilter === 'all' || evt.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const clubName = (clubNameMap[evt.clubId] || '').toLowerCase();
      const matchesSearch =
        !q ||
        evt.name.toLowerCase().includes(q) ||
        (evt.description && evt.description.toLowerCase().includes(q)) ||
        clubName.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [events, statusFilter, searchQuery, clubNameMap]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'upcoming':
        return (
          <Badge variant="info" size="sm" icon={<Clock className="w-3 h-3" />}>
            Upcoming
          </Badge>
        );
      case 'ongoing':
        return (
          <Badge variant="warning" size="sm" icon={<PlayCircle className="w-3 h-3" />}>
            Ongoing
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="danger" size="sm" icon={<XCircle className="w-3 h-3" />}>
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const isUserClubInactive = isClubAdmin && userClub && !userClub.isActive;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
              Event Management
            </h1>
            <Badge variant="neutral" size="sm">
              {isSuperAdmin ? 'All Clubs' : isClubAdmin ? 'Club Admin' : 'Volunteer'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-content-secondary">
            Coordinate upcoming events, track operational status, and manage volunteer assignments.
          </p>
        </div>

        {canCreateEvent && (
          <div className="flex items-center gap-2 shrink-0">
            {isUserClubInactive ? (
              <Button
                variant="secondary"
                size="sm"
                disabled
                title="Cannot create events for an inactive club"
              >
                Club Inactive (Locked)
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateOpen(true)}
              >
                Create Event
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Inactive Club Warning for Club Admin */}
      {isUserClubInactive && (
        <div className="p-3.5 bg-warning-subtle border border-warning-border rounded-panel flex items-center gap-3 text-warning-text">
          <AlertCircle className="w-4 h-4 shrink-0 text-warning" />
          <div className="text-xs sm:text-sm">
            <strong>Club Deactivated:</strong> Your club is currently inactive. You cannot schedule new events until a Super Administrator reactivates the club.
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-surface p-3.5 sm:p-4 border border-border rounded-panel shadow-subtle">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-content-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search events by name, club, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm text-content-primary bg-white border border-border rounded-lg placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-content-muted hover:text-content-primary text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Super Admin Club Filter */}
          {isSuperAdmin && clubs.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="club-filter" className="text-xs font-semibold text-content-secondary whitespace-nowrap">
                Club:
              </label>
              <select
                id="club-filter"
                value={selectedClubFilter}
                onChange={(e) => setSelectedClubFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs sm:text-sm text-content-primary bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary"
              >
                <option value="all">All Clubs</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-border no-scrollbar">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-primary text-white shadow-subtle'
                  : 'bg-surface-muted/60 text-content-secondary hover:text-content-primary hover:bg-surface-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events Content */}
      {isLoading ? (
        <div className="p-12 bg-surface border border-border rounded-panel flex items-center justify-center">
          <LoadingState message="Loading events..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to load events"
          message={error}
          onRetry={fetchEvents}
        />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-6 h-6 text-content-secondary" />}
          title={searchQuery || statusFilter !== 'all' ? 'No matching events found' : 'No events scheduled yet'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'No events match your selected filters. Try changing your search query or status filter.'
              : canCreateEvent && !isUserClubInactive
              ? 'Get started by organizing and creating your first club event.'
              : 'There are currently no events scheduled for your club.'
          }
          action={
            !searchQuery && statusFilter === 'all' && canCreateEvent && !isUserClubInactive && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateOpen(true)}
              >
                Create Event
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-surface border border-border rounded-panel shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60 text-content-secondary font-semibold">
                    <th className="py-3 px-4">Event Name</th>
                    {isSuperAdmin && <th className="py-3 px-4">Club</th>}
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-surface-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-content-primary">
                        <Link
                          to={`/app/events/${evt.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {evt.name}
                        </Link>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3.5 px-4 text-content-secondary">
                          {clubNameMap[evt.clubId] ? (
                            <Link
                              to={`/app/clubs/${evt.clubId}`}
                              className="text-primary hover:underline font-medium text-xs"
                            >
                              {clubNameMap[evt.clubId]}
                            </Link>
                          ) : (
                            <span className="font-mono text-[11px] text-content-muted truncate max-w-[100px] inline-block">
                              {evt.clubId}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-content-secondary whitespace-nowrap">
                        {formatDate(evt.eventDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(evt.status)}
                      </td>
                      <td className="py-3.5 px-4 text-content-secondary max-w-xs truncate">
                        {evt.description || <span className="italic text-content-muted">No description</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link to={`/app/events/${evt.id}`}>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-2.5 text-xs"
                            icon={<ExternalLink className="w-3.5 h-3.5" />}
                          >
                            Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Card Layout (320px-430px safe) */}
          <div className="md:hidden space-y-3">
            {filteredEvents.map((evt) => (
              <Card key={evt.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/app/events/${evt.id}`}
                      className="text-sm font-bold text-content-primary hover:text-primary block truncate"
                    >
                      {evt.name}
                    </Link>
                    {isSuperAdmin && (
                      <span className="text-xs text-primary font-medium block mt-0.5">
                        {clubNameMap[evt.clubId] || evt.clubId}
                      </span>
                    )}
                  </div>
                  {getStatusBadge(evt.status)}
                </div>

                {evt.description && (
                  <p className="text-xs text-content-secondary line-clamp-2">
                    {evt.description}
                  </p>
                )}

                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-content-muted">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(evt.eventDate)}</span>
                  </div>
                  <Link to={`/app/events/${evt.id}`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs h-7 px-2.5"
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      View
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          fetchEvents();
        }}
      />
    </div>
  );
};

export default Events;
