import React from 'react';
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export const CreatedTasksResult = ({
  createdTasks,
  onViewTaskBoard,
  onReset
}) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'No deadline';
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
    <div className="space-y-5 animate-fadeIn">
      {/* Success Banner */}
      <div className="bg-surface border border-success-border rounded-panel p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-success-subtle text-success flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-content-primary">
              {createdTasks.length} {createdTasks.length === 1 ? 'Task' : 'Tasks'} Successfully Created
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary mt-0.5">
              These tasks have been committed to the database and tagged as <strong>AI Extracted</strong> on the task board.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={onReset}
          >
            Extract More
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={onViewTaskBoard}
          >
            View Task Board
          </Button>
        </div>
      </div>

      {/* Created Tasks List */}
      <div className="bg-surface border border-border rounded-panel p-5 shadow-subtle space-y-3">
        <h3 className="text-xs font-bold text-content-primary uppercase tracking-wider">
          Created Event Tasks
        </h3>

        <div className="divide-y divide-border">
          {createdTasks.map((task) => (
            <div key={task.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-content-primary">
                  {task.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-content-secondary">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-content-muted" />
                    {task.assignedTo ? 'Assigned' : 'Unassigned'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-content-muted" />
                    {formatDate(task.deadline)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="neutral" size="sm" icon={<Clock className="w-3 h-3" />}>
                  To Do
                </Badge>
                <Badge variant="info" size="sm" icon={<Sparkles className="w-3 h-3 text-primary" />}>
                  AI Extracted
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreatedTasksResult;
