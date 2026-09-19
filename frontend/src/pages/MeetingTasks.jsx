import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  CheckSquare,
  Building2,
  Calendar,
  ExternalLink,
  Layers,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import EventMeetingTasksTab from '../components/meetingTasks/EventMeetingTasksTab';

export const MeetingTasks = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClubAdmin = user?.role === 'CLUB_ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const initialEventId = searchParams.get('eventId') || '';

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('events');
      const loadedEvents = res.data?.events || [];
      
      // Filter events manageable by this user
      const manageable = loadedEvents.filter((evt) => {
        if (isSuperAdmin) return true;
        if (isClubAdmin && user?.clubId === evt.clubId) return true;
        return false;
      });

      setEvents(manageable);

      if (manageable.length > 0) {
        const found = manageable.find((e) => e.id === initialEventId);
        const activeId = found ? found.id : manageable[0].id;
        setSelectedEventId(activeId);
        setSearchParams({ eventId: activeId });
      }
    } catch (err) {
      setError(err.message || 'Unable to load events for meeting task extraction.');
    } finally {
      setIsLoading(false);
    }
  }, [initialEventId, isSuperAdmin, isClubAdmin, user?.clubId, setSearchParams]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSelectEvent = (evtId) => {
    setSelectedEventId(evtId);
    setSearchParams({ eventId: evtId });
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-primary" />
          AI Meeting → Tasks
        </h1>
        <p className="text-xs sm:text-sm text-content-secondary mt-1">
          Convert raw meeting notes into structured, assignee-resolved tasks for your event board.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-16 bg-surface border border-border rounded-panel">
          <LoadingState message="Loading manageable events..." />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <ErrorState
          title="Unable to load workspace"
          message={error}
          onRetry={fetchEvents}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && events.length === 0 && (
        <EmptyState
          title="No manageable events found"
          description="Create or manage an event to extract tasks from meeting transcripts."
          actionLabel="View Events"
          onAction={() => (window.location.href = '/app/events')}
        />
      )}

      {/* Active Workspace */}
      {!isLoading && !error && events.length > 0 && (
        <div className="space-y-5">
          {/* Event Selector Bar */}
          <div className="bg-surface border border-border rounded-panel p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-content-primary shrink-0">
                Target Event:
              </span>
              <select
                value={selectedEventId}
                onChange={(e) => handleSelectEvent(e.target.value)}
                className="px-3 py-1.5 text-xs sm:text-sm bg-surface border border-border rounded-md font-semibold text-content-primary focus:outline-none focus:border-primary max-w-xs sm:max-w-md truncate"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} ({evt.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedEvent && (
              <div className="flex items-center gap-3 text-xs text-content-secondary">
                <Link
                  to={`/app/events/${selectedEvent.id}?tab=tasks`}
                  className="text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  View Event Task Board
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Render Meeting Tasks Tab */}
          {selectedEventId && (
            <EventMeetingTasksTab
              key={selectedEventId}
              eventId={selectedEventId}
              canManage={true}
              onNavigateToTasks={() => {
                window.location.href = `/app/events/${selectedEventId}?tab=tasks`;
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingTasks;
