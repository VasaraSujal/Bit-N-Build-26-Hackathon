import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Search,
  BookOpen,
  Calendar,
  Building2,
  ExternalLink,
  HelpCircle,
  Clock,
  Layers,
  CheckCircle2,
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
import EventKnowledgeTab from '../components/knowledge/EventKnowledgeTab';

export const Knowledge = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClubAdmin = user?.role === 'CLUB_ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const initialEventId = searchParams.get('eventId') || '';

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [selectedEventDocCount, setSelectedEventDocCount] = useState(0);
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
      setError(err.message || 'Unable to load events for knowledge base.');
    } finally {
      setIsLoadingEvents(false);
    }
  }, [initialEventId, setSearchParams]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch document count for selected event
  useEffect(() => {
    if (!selectedEventId) {
      setSelectedEventDocCount(0);
      return;
    }
    api.get(`events/${selectedEventId}/documents`)
      .then((res) => {
        setSelectedEventDocCount((res.data?.documents || []).length);
      })
      .catch(() => {
        setSelectedEventDocCount(0);
      });
  }, [selectedEventId]);

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
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-primary" />
          Event Knowledge Q&A
        </h1>
        <p className="text-xs sm:text-sm text-content-secondary mt-1">
          Query event guidelines, protocols, and operational notes. Answers are strictly grounded in event documents.
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
          title="Unable to load knowledge base"
          message={error}
          onRetry={fetchEvents}
        />
      )}

      {/* Empty State */}
      {!isLoadingEvents && !error && events.length === 0 && (
        <EmptyState
          title="No events found"
          description="Create or join an event to query its knowledge repository."
          actionLabel="View Events"
          onAction={() => (window.location.href = '/app/events')}
        />
      )}

      {/* Active Knowledge Workspace */}
      {!isLoadingEvents && !error && events.length > 0 && (
        <div className="space-y-5">
          {/* Event Selector Card */}
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
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <strong>{selectedEventDocCount}</strong> {selectedEventDocCount === 1 ? 'document' : 'documents'} indexed
                </span>
                <Link
                  to={`/app/events/${selectedEvent.id}?tab=documents`}
                  className="text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Manage
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Render Grounded Knowledge Tab */}
          {selectedEventId && (
            <EventKnowledgeTab
              eventId={selectedEventId}
              canManage={canManageSelected}
              onNavigateToDocuments={() => {
                window.location.href = `/app/events/${selectedEventId}?tab=documents`;
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Knowledge;
