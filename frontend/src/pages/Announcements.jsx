import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Megaphone,
  Sparkles,
  Building2,
  Calendar,
  ExternalLink,
  Layers,
  MessageSquare
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import EventAnnouncementsTab from '../components/announcements/EventAnnouncementsTab';

export const Announcements = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClubAdmin = user?.role === 'CLUB_ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const initialEventId = searchParams.get('eventId') || '';

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setError(null);
    try {
      const res = await api.get('events');
      const loadedEvents = res.data?.events || [];
      setEvents(loadedEvents);

      if (loadedEvents.length > 0) {
        const found = loadedEvents.find((e) => e.id === initialEventId);
        const activeId = found ? found.id : loadedEvents[0].id;
        setSelectedEventId(activeId);
        setSearchParams({ eventId: activeId });
      }
    } catch (err) {
      setError(err.message || 'Unable to load events for announcements.');
    } finally {
      setIsLoadingEvents(false);
    }
  }, [initialEventId, setSearchParams]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSelectEvent = (evtId) => {
    setSelectedEventId(evtId);
    setSearchParams({ eventId: evtId });
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const canManageSelected = selectedEvent && (
    isSuperAdmin || (isClubAdmin && user?.clubId === selectedEvent.clubId)
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2.5">
          <Megaphone className="w-6 h-6 text-primary" />
          Event Announcements & Broadcasts
        </h1>
        <p className="text-xs sm:text-sm text-content-secondary mt-1">
          Draft AI-assisted announcements, review wording, and dispatch to configured Discord channel webhooks.
        </p>
      </div>

      {/* Loading State */}
      {isLoadingEvents && (
        <div className="py-16 bg-surface border border-border rounded-panel">
          <LoadingState message="Loading events..." />
        </div>
      )}

      {/* Error State */}
      {error && !isLoadingEvents && (
        <ErrorState
          title="Unable to load announcements workspace"
          message={error}
          onRetry={fetchEvents}
        />
      )}

      {/* Empty State */}
      {!isLoadingEvents && !error && events.length === 0 && (
        <EmptyState
          title="No events found"
          description="Create or join an event to manage and send Discord announcements."
          actionLabel="View Events"
          onAction={() => (window.location.href = '/app/events')}
        />
      )}

      {/* Active Announcements Workspace */}
      {!isLoadingEvents && !error && events.length > 0 && (
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
                  to={`/app/events/${selectedEvent.id}?tab=announcements`}
                  className="text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  View Event Space
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Render Tab for Selected Event */}
          {selectedEventId && (
            <EventAnnouncementsTab
              key={selectedEventId}
              eventId={selectedEventId}
              eventName={selectedEvent?.name}
              canManage={canManageSelected}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Announcements;
