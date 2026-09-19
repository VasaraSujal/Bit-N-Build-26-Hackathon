import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  User,
  AlertCircle,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Layers,
  Calendar
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { api } from '../../lib/api';
import { useAuth } from '../../context/useAuth';
import CreateTaskModal from './CreateTaskModal';
import EditTaskModal from './EditTaskModal';
import DeleteTaskModal from './DeleteTaskModal';
import TaskStatusModal from './TaskStatusModal';

const TASK_STATUS_TABS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
  { id: 'blocked', label: 'Blocked' }
];

export const EventTasksTab = ({ eventId, clubId, canManage }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [statusTargetTask, setStatusTargetTask] = useState(null);

  const fetchTasks = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`events/${eventId}/tasks`);
      setTasks(res.data?.tasks || []);
    } catch (err) {
      setError(err.message || 'Unable to load event tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Derived Task Metrics
  const summary = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const blocked = tasks.filter((t) => t.status === 'blocked').length;
    return { total, todo, inProgress, done, blocked };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const assigneeName = (task.assignedTo?.name || '').toLowerCase();
      const assigneeEmail = (task.assignedTo?.email || '').toLowerCase();
      const matchesSearch =
        !q ||
        task.description.toLowerCase().includes(q) ||
        assigneeName.includes(q) ||
        assigneeEmail.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [tasks, statusFilter, searchQuery]);

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

  const canVolunteerUpdate = (task) => {
    return task.assignedTo?.id === user?.id;
  };

  return (
    <div className="space-y-5">
      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider block">
            Total Tasks
          </span>
          <span className="text-xl font-bold text-content-primary mt-0.5 block">
            {summary.total}
          </span>
        </Card>

        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider block">
            To Do
          </span>
          <span className="text-xl font-bold text-content-primary mt-0.5 block">
            {summary.todo}
          </span>
        </Card>

        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-semibold text-warning-text uppercase tracking-wider block">
            In Progress
          </span>
          <span className="text-xl font-bold text-warning-text mt-0.5 block">
            {summary.inProgress}
          </span>
        </Card>

        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-semibold text-success-text uppercase tracking-wider block">
            Done
          </span>
          <span className="text-xl font-bold text-success-text mt-0.5 block">
            {summary.done}
          </span>
        </Card>

        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-semibold text-danger-text uppercase tracking-wider block">
            Blocked
          </span>
          <span className="text-xl font-bold text-danger-text mt-0.5 block">
            {summary.blocked}
          </span>
        </Card>
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="space-y-3 bg-surface p-3.5 sm:p-4 border border-border rounded-panel shadow-subtle">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-content-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search tasks by description or owner..."
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

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <span className="text-xs text-content-secondary">
              Showing <strong className="text-content-primary">{filteredTasks.length}</strong> {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </span>

            {canManage && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateOpen(true)}
              >
                Create Task
              </Button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-border no-scrollbar">
          {TASK_STATUS_TABS.map((tab) => (
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

      {/* Task List Content */}
      {isLoading ? (
        <div className="p-12 bg-surface border border-border rounded-panel flex items-center justify-center">
          <LoadingState message="Loading event tasks..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to load tasks"
          message={error}
          onRetry={fetchTasks}
        />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-6 h-6 text-content-secondary" />}
          title={searchQuery || statusFilter !== 'all' ? 'No matching tasks' : 'No tasks created yet'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'No tasks match your current filter criteria. Try resetting the search or status filter.'
              : canManage
              ? 'Create actionable tasks, assign volunteers, and track operational progress.'
              : 'No tasks have been assigned to this event yet.'
          }
          action={
            !searchQuery && statusFilter === 'all' && canManage && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateOpen(true)}
              >
                Create First Task
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
                    <th className="py-3 px-4">Task Description</th>
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
                    const isMyTask = canVolunteerUpdate(task);
                    return (
                      <tr key={task.id} className="hover:bg-surface-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-content-primary max-w-sm">
                          <p className="line-clamp-2">{task.description}</p>
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
                          <div className="flex items-center justify-end gap-1">
                            {/* Manage or update status */}
                            {(canManage || isMyTask) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => setStatusTargetTask(task)}
                              >
                                Status
                              </Button>
                            )}
                            {canManage && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  icon={<Edit2 className="w-3.5 h-3.5" />}
                                  onClick={() => setEditingTask(task)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-danger hover:bg-danger-subtle"
                                  icon={<Trash2 className="w-3.5 h-3.5" />}
                                  onClick={() => setDeletingTask(task)}
                                >
                                  Delete
                                </Button>
                              </>
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

          {/* Mobile Stacked Card View (320px-430px safe) */}
          <div className="md:hidden space-y-3">
            {filteredTasks.map((task) => {
              const overdue = isOverdue(task.deadline, task.status);
              const isMyTask = canVolunteerUpdate(task);
              return (
                <Card key={task.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-content-primary flex-1">
                      {task.description}
                    </p>
                    {getStatusBadge(task.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-content-secondary pt-1 border-t border-border">
                    <div>
                      <span className="text-[10px] text-content-muted uppercase font-bold block">
                        Assignee
                      </span>
                      <span className="font-medium text-content-primary">
                        {task.assignedTo?.name || 'Unassigned'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-content-muted uppercase font-bold block">
                        Source
                      </span>
                      {getSourceBadge(task.source)}
                    </div>
                  </div>

                  {task.deadline && (
                    <div className="text-xs flex items-center justify-between pt-1 border-t border-border">
                      <span className="text-content-muted flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(task.deadline)}
                      </span>
                      {overdue && (
                        <Badge variant="danger" size="sm" icon={<AlertCircle className="w-3 h-3" />}>
                          Overdue
                        </Badge>
                      )}
                    </div>
                  )}

                  {(canManage || isMyTask) && (
                    <div className="pt-2 border-t border-border flex items-center justify-end gap-1.5 flex-wrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs h-7 px-2.5"
                        onClick={() => setStatusTargetTask(task)}
                      >
                        Update Status
                      </Button>
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2"
                            icon={<Edit2 className="w-3.5 h-3.5" />}
                            onClick={() => setEditingTask(task)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2 text-danger hover:bg-danger-subtle"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={() => setDeletingTask(task)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        eventId={eventId}
        clubId={clubId}
        onSuccess={() => {
          fetchTasks();
        }}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        eventId={eventId}
        clubId={clubId}
        task={editingTask}
        onSuccess={() => {
          fetchTasks();
        }}
      />

      {/* Delete Task Modal */}
      <DeleteTaskModal
        isOpen={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        eventId={eventId}
        task={deletingTask}
        onSuccess={() => {
          fetchTasks();
        }}
      />

      {/* Task Status Modal */}
      <TaskStatusModal
        isOpen={Boolean(statusTargetTask)}
        onClose={() => setStatusTargetTask(null)}
        eventId={eventId}
        task={statusTargetTask}
        onSuccess={() => {
          fetchTasks();
        }}
      />
    </div>
  );
};

export default EventTasksTab;
