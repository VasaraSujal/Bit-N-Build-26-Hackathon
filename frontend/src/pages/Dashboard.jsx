import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Building2,
  Clock,
  PlayCircle,
  CheckCircle2,
  Users,
  ShieldCheck,
  UserCheck,
  Plus,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Layers,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import CreateEventModal from '../components/events/CreateEventModal';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const formatRoleLabel = (role) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Administrator';
    case 'CLUB_ADMIN':
      return 'Club Administrator';
    case 'VOLUNTEER':
      return 'Volunteer';
    default:
      return role || 'User';
  }
};

export const Dashboard = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClubAdmin = user?.role === 'CLUB_ADMIN';
  const isVolunteer = user?.role === 'VOLUNTEER';
  const displayName = user?.name || 'Operations Lead';

  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [clubSummary, setClubSummary] = useState(null);
  const [userClub, setUserClub] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isSuperAdmin) {
        const [eventsRes, clubsRes] = await Promise.all([
          api.get('events'),
          api.get('clubs').catch(() => ({ data: { clubs: [] } }))
        ]);
        setEvents(eventsRes.data?.events || []);
        setClubs(clubsRes.data?.clubs || []);
      } else if (isClubAdmin && user?.clubId) {
        const [eventsRes, clubRes, summaryRes] = await Promise.all([
          api.get('events'),
          api.get(`clubs/${user.clubId}`).catch(() => ({ data: {} })),
          api.get(`clubs/${user.clubId}/summary`).catch(() => ({ data: {} }))
        ]);
        setEvents(eventsRes.data?.events || []);
        setUserClub(clubRes.data?.club || null);
        setClubSummary(summaryRes.data || null);
      } else {
        // Volunteer
        const eventsRes = await api.get('events');
        setEvents(eventsRes.data?.events || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin, isClubAdmin, user?.clubId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derived metrics from real API data
  const metrics = useMemo(() => {
    const totalEvents = events.length;
    const upcomingEvents = events.filter((e) => e.status === 'upcoming').length;
    const ongoingEvents = events.filter((e) => e.status === 'ongoing').length;
    const completedEvents = events.filter((e) => e.status === 'completed').length;
    const cancelledEvents = events.filter((e) => e.status === 'cancelled').length;

    const totalClubs = clubs.length;
    const activeClubs = clubs.filter((c) => c.isActive).length;

    return {
      totalEvents,
      upcomingEvents,
      ongoingEvents,
      completedEvents,
      cancelledEvents,
      totalClubs,
      activeClubs
    };
  }, [events, clubs]);

  const upcomingEventList = useMemo(() => {
    return events
      .filter((e) => e.status === 'upcoming' || e.status === 'ongoing')
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      .slice(0, 5);
  }, [events]);

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
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        {/* Skeleton Banner */}
        <div className="p-6 bg-surface border border-border rounded-panel animate-pulse space-y-3">
          <div className="h-6 bg-surface-muted rounded w-1/3"></div>
          <div className="h-4 bg-surface-muted rounded w-1/2"></div>
        </div>
        {/* Skeleton Metric Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="p-5 bg-surface border border-border rounded-panel animate-pulse space-y-2">
              <div className="h-3 bg-surface-muted rounded w-1/2"></div>
              <div className="h-8 bg-surface-muted rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl space-y-4">
        <ErrorState
          title="Unable to load dashboard data"
          message={error}
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  const isClubInactive = isClubAdmin && userClub && !userClub.isActive;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome Banner */}
      <div className="bg-surface border border-border rounded-panel p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
              {getGreeting()}, {displayName}
            </h1>
            <Badge variant="info" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
              {formatRoleLabel(user?.role)}
            </Badge>
            {userClub && (
              <Badge variant="neutral" size="sm" icon={<Building2 className="w-3.5 h-3.5" />}>
                {userClub.name}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-content-secondary max-w-2xl">
            {isSuperAdmin
              ? 'Global operational console for student club registries, cross-campus events, and organizational governance.'
              : isClubAdmin
              ? `Operational hub for ${userClub?.name || 'your assigned club'}. Coordinate events, volunteer assignments, and schedules.`
              : 'Volunteer workspace. Review upcoming event assignments, tasks, and operational guidelines.'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {isSuperAdmin && (
            <Link to="/app/clubs">
              <Button variant="secondary" size="sm" icon={<Building2 className="w-3.5 h-3.5" />}>
                Manage Clubs
              </Button>
            </Link>
          )}

          {(isSuperAdmin || isClubAdmin) && !isClubInactive && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsCreateEventOpen(true)}
            >
              Create Event
            </Button>
          )}

          {isVolunteer && (
            <Link to="/app/events">
              <Button variant="primary" size="sm" icon={<Calendar className="w-3.5 h-3.5" />}>
                Browse Events
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Inactive Club Warning */}
      {isClubInactive && (
        <div className="p-3.5 bg-warning-subtle border border-warning-border rounded-panel flex items-center gap-3 text-warning-text">
          <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
          <div className="text-xs sm:text-sm">
            <strong>Club Deactivated:</strong> Your club is currently inactive. Event creation is disabled until an administrator reactivates your club.
          </div>
        </div>
      )}

      {/* Operational Metrics Cards (Role-Scoped & Live API Powered) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isSuperAdmin ? (
          <>
            <Card className="p-4 bg-surface">
              <div className="flex items-center justify-between text-content-secondary mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Registered Clubs</span>
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics.totalClubs}
              </div>
              <div className="text-[11px] text-content-muted mt-1">
                {metrics.activeClubs} Active, {metrics.totalClubs - metrics.activeClubs} Inactive
              </div>
            </Card>

            <Card className="p-4 bg-surface">
              <div className="flex items-center justify-between text-content-secondary mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Events</span>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics.totalEvents}
              </div>
              <div className="text-[11px] text-content-muted mt-1">Across all student clubs</div>
            </Card>

            <Card className="p-4 bg-surface">
              <div className="flex items-center justify-between text-content-secondary mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Upcoming & Ongoing</span>
                <Clock className="w-4 h-4 text-warning" />
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics.upcomingEvents + metrics.ongoingEvents}
              </div>
              <div className="text-[11px] text-content-muted mt-1">
                {metrics.ongoingEvents} Ongoing in progress
              </div>
            </Card>

            <Card className="p-4 bg-surface">
              <div className="flex items-center justify-between text-content-secondary mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Completed Events</span>
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics.completedEvents}
              </div>
              <div className="text-[11px] text-content-muted mt-1">Successfully concluded</div>
            </Card>
          </>
        ) : isClubAdmin ? (
          <>
            <Card className="p-4 bg-surface">
              <div className="flex items-center justify-between text-content-secondary mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Club Events</span>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics.totalEvents}
              </div>
              <div className="text-[11px] text-content-muted mt-1">All scheduled events</div>
            </Card>

            <Card className="p-4 bg-surface">
              <div className="flex items-center justify-between text-content-secondary mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Upcoming</span>
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics.upcomingEvents}
              </div>
              <div className="text-[11px] text-content-muted mt-1">Scheduled for future</div>
            </Card>

            <Card className="p-4 bg-surface">
              <div className="flex items-center justify-between text-content-secondary mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Ongoing Now</span>
                <PlayCircle className="w-4 h-4 text-warning" />
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics.ongoingEvents}
              </div>
              <div className="text-[11px] text-content-muted mt-1">Live active operations</div>
            </Card>

            <Card className="p-4 bg-surface">
              <div className="flex items-center justify-between text-content-secondary mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Club Members</span>
                <Users className="w-4 h-4 text-success" />
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {clubSummary?.memberCount ?? '—'}
              </div>
              <div className="text-[11px] text-content-muted mt-1">
                {clubSummary?.volunteerCount ?? '—'} Volunteers assigned
              </div>
            </Card>
          </>
        ) : (
          /* Volunteer Metrics */
          <>
            <Card className="p-4 bg-surface">
              <div className="flex items-center justify-between text-content-secondary mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Accessible Events</span>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics.totalEvents}
              </div>
              <div className="text-[11px] text-content-muted mt-1">Club calendar</div>
            </Card>

            <Card className="p-4 bg-surface">
              <div className="flex items-center justify-between text-content-secondary mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Upcoming</span>
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics.upcomingEvents}
              </div>
              <div className="text-[11px] text-content-muted mt-1">In preparation</div>
            </Card>

            <Card className="p-4 bg-surface">
              <div className="flex items-center justify-between text-content-secondary mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Ongoing</span>
                <PlayCircle className="w-4 h-4 text-warning" />
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics.ongoingEvents}
              </div>
              <div className="text-[11px] text-content-muted mt-1">Active right now</div>
            </Card>

            <Card className="p-4 bg-surface">
              <div className="flex items-center justify-between text-content-secondary mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Concluded</span>
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div className="text-2xl font-bold text-content-primary">
                {metrics.completedEvents}
              </div>
              <div className="text-[11px] text-content-muted mt-1">Past completed</div>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Grid: Upcoming Events & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Operational Events */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-content-primary">
              Upcoming & Active Events
            </h2>
            <Link
              to="/app/events"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View all ({events.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingEventList.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-6 h-6 text-content-secondary" />}
              title="No upcoming events"
              description={
                (isSuperAdmin || isClubAdmin) && !isClubInactive
                  ? 'Create your first event to start organizing club operations.'
                  : 'There are no active or upcoming events scheduled at this time.'
              }
              action={
                (isSuperAdmin || isClubAdmin) && !isClubInactive && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsCreateEventOpen(true)}
                  >
                    Create Event
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-3">
              {upcomingEventList.map((evt) => (
                <Card
                  key={evt.id}
                  className="p-4 hover:border-border-dark transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/app/events/${evt.id}`}
                        className="text-sm font-bold text-content-primary hover:text-primary truncate"
                      >
                        {evt.name}
                      </Link>
                      {getStatusBadge(evt.status)}
                    </div>
                    <div className="text-xs text-content-secondary flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-content-muted" />
                      <span>{formatDate(evt.eventDate)}</span>
                    </div>
                    {evt.description && (
                      <p className="text-xs text-content-secondary line-clamp-1">
                        {evt.description}
                      </p>
                    )}
                  </div>

                  <Link to={`/app/events/${evt.id}`} className="shrink-0 self-start sm:self-auto">
                    <Button variant="secondary" size="sm" className="text-xs" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                      Details
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Operational Modules / Quick Hub */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-content-primary">
            Quick Navigation
          </h2>

          <div className="space-y-2.5">
            {isSuperAdmin && (
              <Link to="/app/clubs" className="block">
                <Card className="p-3.5 hover:border-border-dark transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-primary">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-content-primary block">
                        Club Management
                      </span>
                      <span className="text-[11px] text-content-muted">
                        Manage clubs & admins
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-content-muted" />
                </Card>
              </Link>
            )}

            {isClubAdmin && user?.clubId && (
              <Link to={`/app/clubs/${user.clubId}`} className="block">
                <Card className="p-3.5 hover:border-border-dark transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-primary">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-content-primary block">
                        Club Roster
                      </span>
                      <span className="text-[11px] text-content-muted">
                        View members & volunteers
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-content-muted" />
                </Card>
              </Link>
            )}

            <Link to="/app/events" className="block">
              <Card className="p-3.5 hover:border-border-dark transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-primary">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-content-primary block">
                      Events Calendar
                    </span>
                    <span className="text-[11px] text-content-muted">
                      Full event roster & status
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-content-muted" />
              </Card>
            </Link>

            <Link to="/app/tasks" className="block">
              <Card className="p-3.5 hover:border-border-dark transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-primary">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-content-primary block">
                      Task Board
                    </span>
                    <span className="text-[11px] text-content-muted">
                      Part 4 feature module
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-content-muted" />
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
        }}
      />
    </div>
  );
};

export default Dashboard;
