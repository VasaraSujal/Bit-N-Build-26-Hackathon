import React, { useState } from 'react';
import {
  Sparkles,
  CheckSquare,
  AlertCircle,
  FileText,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';
import MeetingNotesForm from './MeetingNotesForm';
import TaskSuggestions from './TaskSuggestions';
import CreatedTasksResult from './CreatedTasksResult';
import { SameDayTaskConfirmationModal } from '../tasks/SameDayTaskConfirmationModal';

export const EventMeetingTasksTab = ({
  eventId,
  canManage,
  onNavigateToTasks,
  onTasksCreated
}) => {
  const { success: toastSuccess } = useToast();

  const [notes, setNotes] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [isAccepting, setIsAccepting] = useState(false);
  const [createdTasks, setCreatedTasks] = useState(null);
  const [error, setError] = useState('');

  // Same-day assignment confirmation state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictTasks, setConflictTasks] = useState([]);


  // Handle Extraction Call
  const handleExtract = async () => {
    if (!eventId) return;
    setIsExtracting(true);
    setError('');
    setCreatedTasks(null);

    try {
      const res = await api.post(`ai/events/${eventId}/meeting-tasks/extract`, {
        meetingNotes: notes.trim()
      });

      const extractedSuggestions = res.data?.suggestions || res.data?.data?.suggestions || res.suggestions || [];
      setSuggestions(extractedSuggestions);

      // Default select all extracted suggestions
      setSelectedIndices(new Set(extractedSuggestions.map((_, i) => i)));

      toastSuccess(
        `Identified ${extractedSuggestions.length} task suggestions for review.`,
        'Notes Analyzed'
      );
    } catch (err) {
      setError(
        err.message || 'Failed to extract tasks from meeting notes. Please try again.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  // Toggle selection of a suggestion
  const handleToggleSelect = (index) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!suggestions) return;
    setSelectedIndices(new Set(suggestions.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  // Discard suggestions and reset review
  const handleDiscard = () => {
    setSuggestions(null);
    setSelectedIndices(new Set());
    setError('');
  };

  // Accept selected tasks
  const handleAccept = async (confirmed = false) => {
    if (!eventId || !suggestions || selectedIndices.size === 0) return;

    const selectedList = suggestions.filter((_, i) => selectedIndices.has(i));
    const payloadTasks = selectedList.map((s) => ({
      taskDescription: s.taskDescription,
      assignedTo: s.resolvedOwner?.userId || null,
      deadline: s.suggestedDeadline || null
    }));

    setIsAccepting(true);
    setError('');

    try {
      const res = await api.post(`ai/events/${eventId}/meeting-tasks/accept`, {
        tasks: payloadTasks,
        confirmSameDayAssignment: confirmed ? true : undefined
      });

      const newTasks = res.data?.tasks || res.data?.data?.tasks || res.tasks || [];
      setCreatedTasks(newTasks);
      setSuggestions(null);
      setSelectedIndices(new Set());
      setNotes('');
      setShowConflictModal(false);

      toastSuccess(
        `${newTasks.length} tasks successfully added to event board.`,
        'Tasks Created'
      );

      if (onTasksCreated) {
        onTasksCreated(newTasks);
      }
    } catch (err) {
      const data = err.data;
      if (err.status === 409 && (data?.requiresConfirmation || data?.requires_confirmation)) {
        const tasks = data?.data?.conflictingTasks || data?.conflictingTasks || data?.existing_tasks || [];
        setConflictTasks(tasks);
        setShowConflictModal(true);
      } else {
        setError(
          err.message || 'Failed to create tasks. Please check and try again.'
        );
      }
    } finally {
      setIsAccepting(false);
    }
  };


  const handleResetWorkflow = () => {
    setNotes('');
    setSuggestions(null);
    setSelectedIndices(new Set());
    setCreatedTasks(null);
    setError('');
  };

  if (!canManage) {
    return (
      <div className="p-8 bg-surface border border-border rounded-panel text-center max-w-md mx-auto space-y-3">
        <div className="w-10 h-10 rounded-full bg-surface-muted border border-border flex items-center justify-center text-content-muted mx-auto">
          <ShieldAlert className="w-5 h-5 text-warning" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-content-primary">
          Organizer Access Required
        </h3>
        <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
          AI Meeting → Tasks extraction and creation is available to Club Admins and Super Admins organizing this event.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Workflow Step: 3. Created Tasks Success Screen */}
      {createdTasks && (
        <CreatedTasksResult
          createdTasks={createdTasks}
          onViewTaskBoard={onNavigateToTasks}
          onReset={handleResetWorkflow}
        />
      )}

      {/* Workflow Step: 2. Suggestions Review Screen */}
      {!createdTasks && suggestions && (
        <TaskSuggestions
          suggestions={suggestions}
          selectedIndices={selectedIndices}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onAccept={handleAccept}
          onDiscard={handleDiscard}
          isAccepting={isAccepting}
        />
      )}

      {/* Workflow Step: 1. Meeting Notes Input Form */}
      {!createdTasks && !suggestions && (
        <MeetingNotesForm
          notes={notes}
          setNotes={setNotes}
          onExtract={handleExtract}
          isExtracting={isExtracting}
          error={error}
          disabled={!canManage}
        />
      )}

      {/* Same-Day Task Assignment Confirmation Modal */}
      <SameDayTaskConfirmationModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        onConfirm={() => handleAccept(true)}
        conflictingTasks={conflictTasks}
        isSubmitting={isAccepting}
      />

    </div>
  );
};


export default EventMeetingTasksTab;
