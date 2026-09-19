import React from 'react';
import {
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export const TaskSuggestionCard = ({
  suggestion,
  index,
  isSelected,
  onToggleSelect,
  disabled
}) => {
  const {
    taskDescription,
    suggestedOwner,
    resolvedOwner,
    suggestedDeadline,
    confidence
  } = suggestion;

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
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

  const getConfidenceBadge = (lvl) => {
    let normalized = lvl;
    if (typeof lvl === 'number') {
      if (lvl >= 0.8) normalized = 'high';
      else if (lvl >= 0.6) normalized = 'medium';
      else normalized = 'low';
    }
    const val = String(normalized || '').toLowerCase();
    switch (val) {
      case 'high':
        return (
          <Badge variant="success" size="sm">
            High Confidence
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="info" size="sm">
            Medium Confidence
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="warning" size="sm">
            Low Confidence
          </Badge>
        );
      default:
        return (
          <Badge variant="info" size="sm">
            AI Suggestion
          </Badge>
        );
    }
  };

  return (
    <div
      onClick={() => !disabled && onToggleSelect(index)}
      className={`p-4 rounded-panel border transition-all cursor-pointer select-none space-y-3 ${
        isSelected
          ? 'bg-surface border-primary ring-1 ring-primary/30 shadow-subtle'
          : 'bg-surface border-border hover:border-border-focus opacity-80'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-0.5 shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}} // Handled by container onClick
            disabled={disabled}
            className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
          />
        </div>

        {/* Content */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3 className="text-xs sm:text-sm font-bold text-content-primary leading-snug">
              {taskDescription}
            </h3>
            {getConfidenceBadge(confidence)}
          </div>

          {/* Metadata: Assignee & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/60">
            {/* Assignee Information */}
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="w-3.5 h-3.5 text-content-muted shrink-0" />
              {resolvedOwner ? (
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-semibold text-content-primary truncate">
                    {resolvedOwner.name}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] bg-success-subtle text-success border border-success-border font-medium">
                    Verified Member
                  </span>
                </div>
              ) : suggestedOwner ? (
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-content-secondary truncate">
                    Suggested: <strong className="font-medium text-content-primary">{suggestedOwner}</strong>
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] bg-warning-subtle text-warning border border-warning-border font-medium">
                    Unresolved (Unassigned)
                  </span>
                </div>
              ) : (
                <span className="text-content-muted italic">Unassigned</span>
              )}
            </div>

            {/* Deadline Information */}
            <div className="flex items-center gap-1.5 sm:justify-end">
              <Calendar className="w-3.5 h-3.5 text-content-muted shrink-0" />
              {suggestedDeadline ? (
                <span className="text-content-secondary font-medium">
                  {formatDate(suggestedDeadline)}
                </span>
              ) : (
                <span className="text-content-muted italic">No deadline detected</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSuggestionCard;
