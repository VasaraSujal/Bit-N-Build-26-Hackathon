import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Search,
  Clock,
  User,
  AlertCircle,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Calendar,
  Building2,
  ExternalLink,
  Filter
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import TaskStatusModal from '../components/tasks/TaskStatusModal';

const STATUS_TABS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
  { id: 'blocked', label: 'Blocked' }
];

export const Tasks = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClubAdmin = user?.role === 'CLUB_ADMIN';
  const isVolunteer = user?.role === 'VOLUNTEER';

  const [events, setEvents] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [onlyMyTasks, setOnlyMyTasks] = useState(isVolunteer);

  // Status modal
  const [statusTarget, setStatusTarget] = useState(null);

  const fetchGlobalTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch accessible events
      const eventsRes = await api.get('events');
      const loadedEvents = eventsRes.data?.events || [];
      setEvents(loadedEvents);

      // 2. Fetch tasks for each event in parallel
      if (loadedEvents.length > 0) {
        const taskPromises = loadedEvents.map((evt) =>
          api.get(`events/${evt.id}/tasks`)
            .then((res) => (res.data?.tasks || []).map((t) => ({ ...t, eventName: evt.name, eventClubId: evt.clubId })))
            .catch(() => [])
        );

        const taskResults = await Promise.all(taskPromises);
        const flattened = taskResults.flat();
        setAllTasks(flattened);
      } else {
        setAllTasks([]);
      }
    } catch (err) {
      setError(err.message || 'Unable to load task list.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalTasks();
  }, [fetchGlobalTasks]);

  const eventMap = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      map[e.id] = e.name;
    });
    return map;
  }, [events]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const matchesEvent = selectedEventId === 'all' || task.eventId === selectedEventId;
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesMyTasks = !onlyMyTasks || task.assignedTo?.id === user?.id;

      const q = searchQuery.toLowerCase().trim();
      const eventName = (task.eventName || '').toLowerCase();
      const assigneeName = (task.assignedTo?.name || '').toLowerCase();
      const matchesSearch =
        !q ||
        task.description.toLowerCase().includes(q) ||
        eventName.includes(q) ||
        assigneeName.includes(q);

      return matchesEvent && matchesStatus && matchesMyTasks && matchesSearch;
    });
  }, [allTasks, selectedEventId, statusFilter, onlyMyTasks, searchQuery, user?.id]);

  const isOverdue = (deadline, status) => {
    if (!deadline || status === 'done') return false;
    return new Date(deadline) < new Date();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
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
      case 'todo':
        return <Badge variant="neutral" size="sm">To Do</Badge>;
      case 'in_progress':
        return <Badge variant="warning" size="sm" icon={<PlayCircle className="w-3 h-3" />}>In Progress</Badge>;
      case 'done':
        return <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>Done</Badge>;
      case 'blocked':
        return <Badge variant="danger" size="sm" icon={<XCircle className="w-3 h-3" />}>Blocked</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getSourceBadge = (source) => {
    if (source === 'ai_extracted') {
      return (
        <Badge variant="info" size="sm" icon={<Sparkles className="w-3 h-3 text-primary" />}>
          AI Extracted
        </Badge>
      );
    }
    return <Badge variant="neutral" size="sm">Manual</Badge>;
  };

  const canUpdateTaskStatus = (task) => {
    if (isSuperAdmin) return true;
    if (isClubAdmin && user?.clubId === task.eventClubId) return true;
    return task.assignedTo?.id === user?.id;
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
              {isVolunteer ? 'My Tasks & Operations' : 'Task Operations Board'}
            </h1>
            <Badge variant="neutral" size="sm">
              {isSuperAdmin ? 'All Events' : isClubAdmin ? 'Club Scope' : 'Volunteer'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-content-secondary">
            {isVolunteer
              ? 'Review your assigned tasks, deadlines, and update progress states.'
              : 'Cross-event operational action items, assignee accountability, and status tracking.'}
          </p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="space-y-3 bg-surface p-3.5 sm:p-4 border border-border rounded-panel shadow-subtle">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-content-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search tasks, events, or assignees..."
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

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Event Filter */}
            {events.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="event-filter" className="text-xs font-semibold text-content-secondary whitespace-nowrap">
                  Event:
                </label>
                <select
                  id="event-filter"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs sm:text-sm text-content-primary bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary max-w-[180px] truncate"
                >
                  <option value="all">All Events ({events.length})</option>
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* My Tasks Toggle Button */}
            <button
              onClick={() => setOnlyMyTasks(!onlyMyTasks)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                onlyMyTasks
                  ? 'bg-primary text-white border-primary shadow-subtle'
                  : 'bg-white text-content-secondary border-border hover:bg-surface-muted'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Assigned to Me</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-border no-scrollbar">
          {STATUS_TABS.map((tab) => (
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

      {/* Task List Body */}
      {isLoading ? (
        <div className="p-12 bg-surface border border-border rounded-panel flex items-center justify-center">
          <LoadingState message="Loading tasks..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to load tasks"
          message={error}
          onRetry={fetchGlobalTasks}
        />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-6 h-6 text-content-secondary" />}
          title={
            searchQuery || statusFilter !== 'all' || selectedEventId !== 'all' || onlyMyTasks
              ? 'No matching tasks found'
              : 'No tasks scheduled'
          }
          description={
            onlyMyTasks
              ? 'You do not have any tasks currently assigned to you matching the criteria.'
              : 'There are no tasks recorded across your accessible events.'
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-surface border border-border rounded-panel shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60 text-content-secondary font-semibold">
                    <th className="py-3 px-4">Task Description</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Deadline</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTasks.map((task) => {
                    const overdue = isOverdue(task.deadline, task.status);
                    const canUpdate = canUpdateTaskStatus(task);
                    return (
                      <tr key={task.id} className="hover:bg-surface-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-content-primary max-w-sm">
                          <p className="line-clamp-2">{task.description}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <Link
                            to={`/app/events/${task.eventId}`}
                            className="text-primary hover:underline font-semibold text-xs inline-flex items-center gap-1"
                          >
                            <span>{task.eventName || eventMap[task.eventId] || 'Event'}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </Link>
                        </td>

                        <td className="py-3.5 px-4">
                          {task.assignedTo ? (
                            <div>
                              <span className="font-semibold text-content-primary block">
                                {task.assignedTo.name}
                              </span>
                              <span className="text-[11px] text-content-secondary font-mono">
                                {task.assignedTo.email}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-surface-muted text-content-muted border border-border">
                              Unassigned
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {task.deadline ? (
                            <div className="space-y-0.5">
                              <span className="text-content-secondary block">
                                {formatDate(task.deadline)}
                              </span>
                              {overdue && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-danger">
                                  <AlertCircle className="w-3 h-3" />
                                  Overdue
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="italic text-content-muted">No deadline</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(task.status)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getSourceBadge(task.source)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {canUpdate ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 px-2.5 text-xs"
                              onClick={() => setStatusTarget(task)}
                            >
                              Status
                            </Button>
                          ) : (
                            <span className="text-[11px] text-content-muted italic">Read-only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Card View (320px-430px safe) */}
          <div className="md:hidden space-y-3">
            {filteredTasks.map((task) => {
              const overdue = isOverdue(task.deadline, task.status);
              const canUpdate = canUpdateTaskStatus(task);
              return (
                <Card key={task.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-content-primary flex-1">
                      {task.description}
                    </p>
                    {getStatusBadge(task.status)}
                  </div>

                  <div className="text-xs text-content-secondary flex items-center justify-between pt-1 border-t border-border">
                    <Link
                      to={`/app/events/${task.eventId}`}
                      className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <span>{task.eventName || eventMap[task.eventId] || 'Event'}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </Link>
                    {getSourceBadge(task.source)}
                  </div>

                  <div className="text-xs text-content-secondary flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-content-muted uppercase font-bold block">
                        Assignee
                      </span>
                      <span className="font-medium text-content-primary">
                        {task.assignedTo?.name || 'Unassigned'}
                      </span>
                    </div>

                    {task.deadline && (
                      <div className="text-right">
                        <span className="text-[10px] text-content-muted uppercase font-bold block">
                          Deadline
                        </span>
                        <span className={overdue ? 'text-danger font-bold' : ''}>
                          {formatDate(task.deadline)}
                        </span>
                      </div>
                    )}
                  </div>

                  {canUpdate && (
                    <div className="pt-2 border-t border-border flex items-center justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs h-7 px-3"
                        onClick={() => setStatusTarget(task)}
                      >
                        Update Status
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Task Status Modal */}
      <TaskStatusModal
        isOpen={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        eventId={statusTarget?.eventId}
        task={statusTarget}
        onSuccess={() => {
          fetchGlobalTasks();
        }}
      />
    </div>
  );
};

export default Tasks;
