import React, { useState } from 'react';
import { Sparkles, FileText, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

const SAMPLE_NOTES = [
  {
    label: 'Core Committee Meeting',
    content: `Bit N Build '26 Organizing Committee Sync - Sep 19
Attendees: Rahul Patel, Priya Shah, Sujal Vasara, Arya Patel

Action Items discussed:
1. Rahul Patel needs to finalize the sponsor confirmation and send the deck by Sep 25, 2026.
2. Priya Shah will confirm the volunteer briefing schedule and prepare orientation badges by Sep 24, 2026.
3. Stage management setup requirements must be finalized by Sep 27, 2026.
4. Food and catering vendor delivery logistics need to be coordinated for the main entrance by Sep 28, 2026.`
  },
  {
    label: 'Volunteer Briefing Notes',
    content: `Volunteer Operations Debrief:
- Security desk check-in protocols must be reviewed and printed by Sep 23, 2026.
- Priya Shah to coordinate registration kit distribution at Gate 2.
- Hall B audio-visual setup testing scheduled for Sep 26, 2026.`
  }
];

export const MeetingNotesForm = ({
  notes,
  setNotes,
  onExtract,
  isExtracting,
  error,
  disabled
}) => {
  const [fieldError, setFieldError] = useState('');

  const handleExtract = (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      setFieldError('Please enter or paste meeting notes to extract tasks.');
      return;
    }
    if (notes.length > 10000) {
      setFieldError('Meeting notes exceed maximum allowed character length of 10,000.');
      return;
    }
    setFieldError('');
    onExtract();
  };

  const handleInsertSample = (sampleText) => {
    setNotes(sampleText);
    setFieldError('');
  };

  return (
    <div className="bg-surface border border-border rounded-panel p-5 sm:p-6 shadow-subtle space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-content-primary">
              AI Meeting Notes Extraction
            </h2>
            <p className="text-xs text-content-secondary">
              Paste meeting notes or transcripts. AI will detect actionable tasks, assignees, and deadlines for your review.
            </p>
          </div>
        </div>
      </div>

      {/* Human-in-the-loop Operational Notice */}
      <div className="p-3 bg-surface-muted border border-border rounded-lg flex items-start gap-2.5 text-xs text-content-secondary">
        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <span>
          <strong>Human Review Required:</strong> AI analyzes notes and generates suggestions only. No tasks are written to the database until you review and confirm them.
        </span>
      </div>

      <form onSubmit={handleExtract} className="space-y-3">
        {(error || fieldError) && (
          <div className="p-3 bg-danger-subtle border border-danger-border rounded-md flex items-start gap-2 text-xs text-danger">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{fieldError || error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-content-primary">
              Meeting Notes / Transcript <span className="text-danger">*</span>
            </label>
            <span
              className={`text-[11px] font-mono ${
                notes.length > 10000 ? 'text-danger font-bold' : 'text-content-muted'
              }`}
            >
              {notes.length.toLocaleString()} / 10,000 characters
            </span>
          </div>

          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (fieldError) setFieldError('');
            }}
            placeholder="Paste your meeting notes, minutes, or transcript here. E.g.
'Rahul to send sponsor confirmation by Sep 25. Priya will manage volunteer briefing...'"
            rows={8}
            maxLength={10000}
            disabled={isExtracting || disabled}
            className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-surface border rounded-md focus:outline-none focus:ring-1 font-mono leading-relaxed ${
              fieldError || notes.length > 10000
                ? 'border-danger focus:border-danger focus:ring-danger'
                : 'border-border focus:border-primary focus:ring-primary'
            }`}
          />
        </div>

        {/* Quick Samples and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-content-muted uppercase tracking-wider mr-1">
              Samples:
            </span>
            {SAMPLE_NOTES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsertSample(sample.content)}
                disabled={isExtracting || disabled}
                className="px-2.5 py-1 text-xs bg-surface-muted hover:bg-surface border border-border rounded text-content-secondary hover:text-primary transition-colors text-left"
              >
                {sample.label}
              </button>
            ))}
            {notes && (
              <button
                type="button"
                onClick={() => setNotes('')}
                disabled={isExtracting || disabled}
                className="px-2 py-1 text-xs text-content-muted hover:text-danger transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isExtracting}
            disabled={isExtracting || !notes.trim() || disabled}
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            {isExtracting ? 'Analyzing Meeting Notes...' : 'Extract Task Suggestions'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MeetingNotesForm;
