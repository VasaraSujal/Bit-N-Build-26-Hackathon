import React from 'react';
import {
  Sparkles,
  CheckSquare,
  Square,
  CheckCircle2,
  Trash2,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import TaskSuggestionCard from './TaskSuggestionCard';

export const TaskSuggestions = ({
  suggestions,
  selectedIndices,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onAccept,
  onDiscard,
  isAccepting
}) => {
  const selectedCount = selectedIndices.size;
  const totalCount = suggestions.length;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  if (totalCount === 0) {
    return (
      <div className="p-8 bg-surface border border-dashed border-border rounded-panel text-center max-w-md mx-auto space-y-3">
        <div className="w-10 h-10 rounded-full bg-surface-muted border border-border flex items-center justify-center text-content-muted mx-auto">
          <HelpCircle className="w-5 h-5 text-warning" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-content-primary">
          No Actionable Tasks Found
        </h3>
        <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
          The meeting notes did not contain enough clear action items to create task suggestions. Try adding specific responsibilities, deadlines, or assignees.
        </p>
        <Button variant="secondary" size="sm" onClick={onDiscard}>
          Try Another Note
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header and Bulk Selection Controls */}
      <div className="bg-surface border border-border rounded-panel p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-content-primary">
              Extracted Task Suggestions
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-subtle text-primary">
              {totalCount} {totalCount === 1 ? 'task' : 'tasks'} found
            </span>
          </div>
          <p className="text-xs text-content-secondary">
            Review and select the items to add to the event task board.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            icon={
              allSelected ? (
                <Square className="w-3.5 h-3.5" />
              ) : (
                <CheckSquare className="w-3.5 h-3.5" />
              )
            }
            disabled={isAccepting}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-subtle"
            onClick={onDiscard}
            disabled={isAccepting}
          >
            Discard
          </Button>
        </div>
      </div>

      {/* Suggestion Cards List */}
      <div className="space-y-2.5">
        {suggestions.map((suggestion, index) => (
          <TaskSuggestionCard
            key={index}
            suggestion={suggestion}
            index={index}
            isSelected={selectedIndices.has(index)}
            onToggleSelect={onToggleSelect}
            disabled={isAccepting}
          />
        ))}
      </div>

      {/* Confirmation Toolbar */}
      <div className="bg-surface border border-border rounded-panel p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sticky bottom-4 z-10 backdrop-blur-md bg-surface/95">
        <div className="flex items-center gap-2 text-xs text-content-secondary">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span>
            <strong>{selectedCount}</strong> of <strong>{totalCount}</strong> selected for creation
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onDiscard}
            disabled={isAccepting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isAccepting}
            disabled={selectedCount === 0 || isAccepting}
            onClick={onAccept}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            {isAccepting
              ? 'Creating Tasks...'
              : `Accept Selected Tasks (${selectedCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskSuggestions;
