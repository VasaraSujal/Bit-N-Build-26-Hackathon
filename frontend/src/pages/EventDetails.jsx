import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Building2,
  Edit2,
  XCircle,
  CheckCircle2,
  PlayCircle,
  ArrowLeft,
  CheckSquare,
  Users,
  AlertTriangle,
  FileText,
  Megaphone,
  Layers,
  Sparkles,
  ShieldAlert,
  BookOpen
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import EditEventModal from '../components/events/EditEventModal';
import CancelEventModal from '../components/events/CancelEventModal';
import StatusChangeModal from '../components/events/StatusChangeModal';
import EventTasksTab from '../components/tasks/EventTasksTab';
import EventVolunteersTab from '../components/volunteers/EventVolunteersTab';
import EventRisksTab from '../components/risks/EventRisksTab';
import EventDocumentsTab from '../components/documents/EventDocumentsTab';
import EventKnowledgeTab from '../components/knowledge/EventKnowledgeTab';
import EventMeetingTasksTab from '../components/meetingTasks/EventMeetingTasksTab';
import EventAnnouncementsTab from '../components/announcements/EventAnnouncementsTab';

export const EventDetails = ({ initialTab }) => {
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClubAdmin = user?.role === 'CLUB_ADMIN';

  const [event, setEvent] = useState(null);
  const [club, setClub] = useState(null);
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [taskCounts, setTaskCounts] = useState({ total: 0, done: 0 });
  const [riskCounts, setRiskCounts] = useState({ total: 0, open: 0 });
  const [documentCount, setDocumentCount] = useState(0);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState(initialTab || urlTab || 'overview');

  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'overview') {
      searchParams.delete('tab');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ tab: tabId });
    }
  };

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const fetchEventData = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [eventRes, volsRes, tasksRes, risksRes, docsRes, annsRes] = await Promise.all([
        api.get(`events/${eventId}`),
        api.get(`events/${eventId}/volunteers`).catch(() => ({ data: { volunteers: [] } })),
        api.get(`events/${eventId}/tasks`).catch(() => ({ data: { tasks: [] } })),
        api.get(`events/${eventId}/risks`).catch(() => ({ data: { risks: [] } })),
        api.get(`events/${eventId}/documents`).catch(() => ({ data: { documents: [] } })),
        api.get(`events/${eventId}/announcements`).catch(() => ({ data: { announcements: [] } }))
      ]);

      const evt = eventRes.data?.event;
      setEvent(evt);

      const vols = volsRes.data?.volunteers || [];
      setVolunteerCount(vols.length);

      const tasks = tasksRes.data?.tasks || [];
      const doneTasks = tasks.filter((t) => t.status === 'done').length;
      setTaskCounts({ total: tasks.length, done: doneTasks });

      const risks = risksRes.data?.risks || [];
      const openRisks = risks.filter((r) => r.status === 'open').length;
      setRiskCounts({ total: risks.length, open: openRisks });

      const docs = docsRes.data?.documents || [];
      setDocumentCount(docs.length);

      const anns = annsRes.data?.data?.announcements || annsRes.data?.announcements || [];
      setAnnouncementCount(anns.length);

      if (evt?.clubId) {
        const clubRes = await api.get(`clubs/${evt.clubId}`).catch(() => ({ data: {} }));
        setClub(clubRes.data?.club || null);
      }
    } catch (err) {
      setError(err.message || 'Unable to load event details.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const canManageEvent = isSuperAdmin || (isClubAdmin && user?.clubId === event?.clubId);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return (
          <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
            Published
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="info" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="danger" size="sm" icon={<XCircle className="w-3 h-3" />}>
            Cancelled
          </Badge>
        );
      case 'draft':
      default:
        return (
          <Badge variant="neutral" size="sm" icon={<Clock className="w-3 h-3" />}>
            Draft
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="py-16">
        <LoadingState message="Loading event workspace..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="py-12">
        <ErrorState
          title="Unable to load event"
          message={error || 'Event was not found or you do not have permission to view it.'}
          onRetry={fetchEventData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-content-secondary">
        <Link to="/app/events" className="hover:text-content-primary flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Events
        </Link>
        <span>/</span>
        <span className="text-content-primary font-medium truncate">{event.name}</span>
      </div>

      {/* Event Header Banner Card */}
      <div className="bg-surface border border-border rounded-panel p-5 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
              {event.name}
            </h1>
            {getStatusBadge(event.status)}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-content-secondary">
            {club && (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" />
                <Link
                  to={isSuperAdmin || (isClubAdmin && user?.clubId === club.id) ? `/app/clubs/${club.id}` : '#'}
                  className="font-medium text-content-primary hover:text-primary"
                >
                  {club.name}
                </Link>
              </span>
            )}
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-content-muted" />
              <span>{formatDate(event.eventDate)}</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-content-secondary max-w-3xl pt-1">
            {event.description || <span className="italic text-content-muted">No description provided for this event.</span>}
          </p>
        </div>

        {/* Management Controls */}
        {canManageEvent && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => setIsEditOpen(true)}
            >
              Edit Event
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<PlayCircle className="w-3.5 h-3.5" />}
              onClick={() => setIsStatusOpen(true)}
            >
              Update Status
            </Button>
            {event.status !== 'cancelled' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger-subtle"
                icon={<XCircle className="w-3.5 h-3.5" />}
                onClick={() => setIsCancelOpen(true)}
              >
                Cancel Event
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Feature Module Tabs */}
      <div className="space-y-5">
        <div className="border-b border-border flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleTabChange('overview')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-content-secondary hover:text-content-primary'
            }`}
          >
            <Layers className="w-4 h-4" />
            Overview
          </button>

          <button
            onClick={() => handleTabChange('tasks')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'border-primary text-primary'
                : 'border-transparent text-content-secondary hover:text-content-primary'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Tasks ({taskCounts.total})
          </button>

          <button
            onClick={() => handleTabChange('volunteers')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'volunteers'
                ? 'border-primary text-primary'
                : 'border-transparent text-content-secondary hover:text-content-primary'
            }`}
          >
            <Users className="w-4 h-4" />
            Volunteers ({volunteerCount})
          </button>

          <button
            onClick={() => handleTabChange('risks')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'risks'
                ? 'border-primary text-primary'
                : 'border-transparent text-content-secondary hover:text-content-primary'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Risks ({riskCounts.open})
          </button>

          <button
            onClick={() => handleTabChange('documents')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'documents'
                ? 'border-primary text-primary'
                : 'border-transparent text-content-secondary hover:text-content-primary'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documents ({documentCount})
          </button>

          <button
            onClick={() => handleTabChange('knowledge')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'knowledge'
                ? 'border-primary text-primary'
                : 'border-transparent text-content-secondary hover:text-content-primary'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Knowledge
          </button>

          <button
            onClick={() => handleTabChange('meeting-tasks')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'meeting-tasks'
                ? 'border-primary text-primary'
                : 'border-transparent text-content-secondary hover:text-content-primary'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Meeting → Tasks
          </button>

          <button
            onClick={() => handleTabChange('announcements')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'announcements'
                ? 'border-primary text-primary'
                : 'border-transparent text-content-secondary hover:text-content-primary'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Announcements ({announcementCount})
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Quick Operational Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4">
              <Card
                className="p-4 bg-surface hover:border-primary cursor-pointer transition-colors"
                onClick={() => handleTabChange('volunteers')}
              >
                <div className="flex items-center justify-between text-content-secondary mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Volunteers</span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-content-primary">
                  {volunteerCount}
                </div>
                <div className="text-[11px] text-primary hover:underline mt-1">
                  View roster →
                </div>
              </Card>

              <Card
                className="p-4 bg-surface hover:border-primary cursor-pointer transition-colors"
                onClick={() => handleTabChange('tasks')}
              >
                <div className="flex items-center justify-between text-content-secondary mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Event Tasks</span>
                  <CheckSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-content-primary">
                  {taskCounts.total}
                </div>
                <div className="text-[11px] text-content-muted mt-1">
                  {taskCounts.done} of {taskCounts.total} done
                </div>
              </Card>

              <Card
                className={`p-4 bg-surface hover:border-primary cursor-pointer transition-colors ${
                  riskCounts.open > 0 ? 'border-warning-border' : ''
                }`}
                onClick={() => handleTabChange('risks')}
              >
                <div className="flex items-center justify-between text-content-secondary mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Open Risks</span>
                  <AlertTriangle className={`w-4 h-4 ${riskCounts.open > 0 ? 'text-warning' : 'text-content-muted'}`} />
                </div>
                <div className={`text-2xl font-bold ${riskCounts.open > 0 ? 'text-warning-text' : 'text-content-primary'}`}>
                  {riskCounts.open}
                </div>
                <div className="text-[11px] text-primary hover:underline mt-1">
                  {riskCounts.open > 0 ? 'Review & resolve →' : 'No risks →'}
                </div>
              </Card>

              <Card
                className="p-4 bg-surface hover:border-primary cursor-pointer transition-colors"
                onClick={() => handleTabChange('documents')}
              >
                <div className="flex items-center justify-between text-content-secondary mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Documents</span>
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-content-primary">
                  {documentCount}
                </div>
                <div className="text-[11px] text-primary hover:underline mt-1">
                  Knowledge docs →
                </div>
              </Card>

              <Card
                className="p-4 bg-surface hover:border-primary cursor-pointer transition-colors"
                onClick={() => handleTabChange('announcements')}
              >
                <div className="flex items-center justify-between text-content-secondary mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Broadcasts</span>
                  <Megaphone className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-content-primary">
                  {announcementCount}
                </div>
                <div className="text-[11px] text-primary hover:underline mt-1">
                  Discord drafts →
                </div>
              </Card>

              <Card className="p-4 bg-surface col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between text-content-secondary mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Host Club</span>
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="text-sm font-bold text-content-primary truncate pt-1">
                  {club?.name || 'Assigned Club'}
                </div>
                <div className="text-[11px] text-content-muted mt-1">
                  Organizing entity
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="md:col-span-2 p-5 space-y-4">
                <h3 className="text-sm font-bold text-content-primary">
                  Event Information
                </h3>
                <div className="space-y-3 text-xs sm:text-sm text-content-secondary">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface-muted/50 rounded-lg border border-border">
                    <div>
                      <span className="text-[11px] font-semibold text-content-muted uppercase tracking-wider block">
                        Scheduled Date & Time
                      </span>
                      <span className="font-semibold text-content-primary block mt-0.5">
                        {formatDate(event.eventDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-content-muted uppercase tracking-wider block">
                        Current Status
                      </span>
                      <span className="mt-0.5 inline-block">
                        {getStatusBadge(event.status)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-content-primary block mb-1">
                      Event Description
                    </span>
                    <div className="p-3 bg-white border border-border rounded-lg text-content-secondary leading-relaxed">
                      {event.description || 'No detailed description provided.'}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-content-primary">
                  Operational Metadata
                </h3>
                <div className="space-y-3 text-xs text-content-secondary">
                  <div>
                    <span className="text-[11px] text-content-muted block">Event ID</span>
                    <span className="font-mono text-content-primary text-[11px] break-all">{event.id}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-content-muted block">Club ID</span>
                    <span className="font-mono text-content-primary text-[11px] break-all">{event.clubId}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-content-muted block">Created At</span>
                    <span className="text-content-primary">{formatDate(event.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-content-muted block">Last Updated</span>
                    <span className="text-content-primary">{formatDate(event.updatedAt)}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Tasks Management (Part 4 Module) */}
        {activeTab === 'tasks' && (
          <EventTasksTab
            eventId={eventId}
            clubId={event.clubId}
            canManage={canManageEvent}
          />
        )}

        {/* Tab 3: Volunteers Management (Part 4 Module) */}
        {activeTab === 'volunteers' && (
          <EventVolunteersTab
            eventId={eventId}
            clubId={event.clubId}
            canManage={canManageEvent}
          />
        )}

        {/* Tab 4: Risks Management (Part 5 Module) */}
        {activeTab === 'risks' && (
          <EventRisksTab
            eventId={eventId}
            canManage={canManageEvent}
          />
        )}

        {/* Tab 5: Documents Management (Part 6 Module) */}
        {activeTab === 'documents' && (
          <EventDocumentsTab
            eventId={eventId}
            canManage={canManageEvent}
            onDocumentCountChange={(newCount) => setDocumentCount(newCount)}
          />
        )}

        {/* Tab 6: Knowledge / Grounded RAG (Part 6 Module) */}
        {activeTab === 'knowledge' && (
          <EventKnowledgeTab
            eventId={eventId}
            canManage={canManageEvent}
            onNavigateToDocuments={() => handleTabChange('documents')}
          />
        )}

        {/* Tab 7: Meeting -> Tasks (Part 7 Module) */}
        {activeTab === 'meeting-tasks' && (
          <EventMeetingTasksTab
            eventId={eventId}
            canManage={canManageEvent}
            onNavigateToTasks={() => handleTabChange('tasks')}
            onTasksCreated={() => {
              fetchEventData();
            }}
          />
        )}

        {/* Tab 8: Announcements & Discord Broadcast (Part 8 Module) */}
        {activeTab === 'announcements' && (
          <EventAnnouncementsTab
            eventId={eventId}
            eventName={event.name}
            canManage={canManageEvent}
            onAnnouncementCountChange={(newCount) => setAnnouncementCount(newCount)}
          />
        )}
      </div>

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        event={event}
        onSuccess={(updated) => {
          setEvent((prev) => ({ ...prev, ...updated }));
        }}
      />

      {/* Cancel Event Modal */}
      <CancelEventModal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        event={event}
        onSuccess={(updated) => {
          setEvent((prev) => ({ ...prev, ...updated, status: 'cancelled' }));
        }}
      />

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        event={event}
        onSuccess={(updated) => {
          setEvent((prev) => ({ ...prev, ...updated }));
        }}
      />
    </div>
  );
};

export default EventDetails;
