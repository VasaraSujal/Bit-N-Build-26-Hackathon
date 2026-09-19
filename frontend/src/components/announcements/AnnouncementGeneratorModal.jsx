import React, { useState } from 'react';
import { Sparkles, Megaphone, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

const SAMPLES = [
  {
    purpose: 'Registration Deadline Reminder',
    details: 'Reminder that registrations for Hackathon 2026 close tomorrow at 11:59 PM. All team members must be listed with their student IDs. Late submissions will not be accepted.'
  },
  {
    purpose: 'Venue Check-in & Entry Protocol',
    details: 'Check-in opens at 9:00 AM at Gate 2. Please carry your student ID card. Volunteers will be stationed at the registration desk for badge collection.'
  },
  {
    purpose: 'Schedule Update & Speaker Keynote',
    details: 'The opening ceremony and keynote address have been rescheduled to 10:30 AM in Main Auditorium. Please be seated 15 minutes before the session.'
  }
];

export const AnnouncementGeneratorModal = ({ isOpen, onClose, eventId, onSuccess }) => {
  const { success: toastSuccess } = useToast();
  const [purpose, setPurpose] = useState('');
  const [details, setDetails] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!purpose.trim()) {
      errs.purpose = 'Announcement purpose/topic is required.';
    } else if (purpose.trim().length > 500) {
      errs.purpose = 'Purpose cannot exceed 500 characters.';
    }

    if (!details.trim()) {
      errs.details = 'Announcement details/context are required.';
    } else if (details.trim().length > 3000) {
      errs.details = 'Details cannot exceed 3,000 characters.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsGenerating(true);
    setError('');

    try {
      const res = await api.post(`ai/events/${eventId}/announcements/generate`, {
        purpose: purpose.trim(),
        details: details.trim()
      });

      const generated = res.data?.data?.announcement;

      toastSuccess(
        'AI announcement draft generated. Review and edit before sending.',
        'Draft Generated'
      );

      if (onSuccess) {
        onSuccess(generated);
      }
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to generate announcement draft.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySample = (sample) => {
    setPurpose(sample.purpose);
    setDetails(sample.details);
    setFieldErrors({});
    setError('');
  };

  const handleClose = () => {
    setPurpose('');
    setDetails('');
    setError('');
    setFieldErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface border border-border rounded-panel max-w-2xl w-full p-5 sm:p-6 shadow-panel max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-content-primary">
                Generate Announcement with AI
              </h2>
              <p className="text-xs text-content-secondary">
                AI will draft a formatted announcement. You will review and edit it before sending.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors"
            disabled={isGenerating}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="space-y-4 pt-4 flex-1 overflow-y-auto pr-1">
          {error && (
            <div className="p-3 bg-danger-subtle border border-danger-border rounded-md flex items-start gap-2 text-xs text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Human Review Reminder */}
          <div className="p-3 bg-surface-muted border border-border rounded-lg flex items-start gap-2 text-xs text-content-secondary">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Draft Only:</strong> AI generation creates an editable draft. It is never automatically broadcasted to Discord.
            </span>
          </div>

          {/* Quick Samples */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-content-muted uppercase tracking-wider block">
              Quick Templates:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLES.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplySample(s)}
                  disabled={isGenerating}
                  className="px-2.5 py-1 text-xs bg-surface-muted hover:bg-surface border border-border rounded text-content-secondary hover:text-primary transition-colors text-left"
                >
                  {s.purpose}
                </button>
              ))}
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-content-primary">
                Announcement Purpose / Headline <span className="text-danger">*</span>
              </label>
              <span className="text-[11px] text-content-muted">
                {purpose.length}/500
              </span>
            </div>
            <input
              type="text"
              value={purpose}
              onChange={(e) => {
                setPurpose(e.target.value);
                if (fieldErrors.purpose) setFieldErrors((prev) => ({ ...prev, purpose: '' }));
              }}
              placeholder="e.g. Registration Closing Tonight, Venue Entry Protocol, Speaker Keynote"
              maxLength={500}
              disabled={isGenerating}
              className={`w-full px-3 py-2 text-sm bg-surface border rounded-md focus:outline-none focus:ring-1 ${
                fieldErrors.purpose
                  ? 'border-danger focus:border-danger focus:ring-danger'
                  : 'border-border focus:border-primary focus:ring-primary'
              }`}
            />
            {fieldErrors.purpose && (
              <p className="text-[11px] text-danger">{fieldErrors.purpose}</p>
            )}
          </div>

          {/* Details */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-content-primary">
                Key Details & Information to Include <span className="text-danger">*</span>
              </label>
              <span className="text-[11px] text-content-muted">
                {details.length.toLocaleString()}/3,000
              </span>
            </div>
            <textarea
              value={details}
              onChange={(e) => {
                setDetails(e.target.value);
                if (fieldErrors.details) setFieldErrors((prev) => ({ ...prev, details: '' }));
              }}
              placeholder="Provide bullet points, specific times, locations, contact points, or important links..."
              rows={6}
              maxLength={3000}
              disabled={isGenerating}
              className={`w-full px-3 py-2 text-sm bg-surface border rounded-md focus:outline-none focus:ring-1 font-mono text-xs leading-relaxed ${
                fieldErrors.details
                  ? 'border-danger focus:border-danger focus:ring-danger'
                  : 'border-border focus:border-primary focus:ring-primary'
              }`}
            />
            {fieldErrors.details && (
              <p className="text-[11px] text-danger">{fieldErrors.details}</p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClose}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isGenerating}
              disabled={isGenerating || !purpose.trim() || !details.trim()}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              {isGenerating ? 'Generating Draft...' : 'Generate Draft'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementGeneratorModal;
