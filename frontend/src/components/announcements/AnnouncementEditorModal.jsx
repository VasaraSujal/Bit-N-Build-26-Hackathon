import React, { useState, useEffect } from 'react';
import { Edit2, AlertCircle, X, Eye, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const AnnouncementEditorModal = ({
  isOpen,
  onClose,
  eventId,
  announcement,
  onSuccess,
  onOpenPreview,
  onOpenSend
}) => {
  const { success: toastSuccess } = useToast();
  const [finalText, setFinalText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    if (announcement) {
      setFinalText(announcement.finalText || announcement.draftText || '');
      setError('');
      setFieldError('');
    }
  }, [announcement]);

  if (!isOpen || !announcement) return null;

  const isSent = announcement.status === 'sent' || Boolean(announcement.sentAt);

  const validate = () => {
    if (!finalText.trim()) {
      setFieldError('Announcement text cannot be empty.');
      return false;
    }
    if (finalText.trim().length > 5000) {
      setFieldError('Announcement text cannot exceed 5,000 characters.');
      return false;
    }
    setFieldError('');
    return true;
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    setError('');

    try {
      const res = await api.put(
        `events/${eventId}/announcements/${announcement.id}`,
        {
          finalText: finalText.trim()
        }
      );

      const updated = res.data?.data?.announcement || res.data?.announcement;

      toastSuccess(
        'Announcement content updated successfully.',
        'Announcement Saved'
      );

      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update announcement text.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface border border-border rounded-panel max-w-3xl w-full p-5 sm:p-6 shadow-panel max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-content-primary">
                {isSent ? 'View Sent Announcement' : 'Edit & Finalize Announcement'}
              </h2>
              <p className="text-xs text-content-secondary">
                {isSent
                  ? 'This announcement was delivered to Discord and is archived as read-only.'
                  : 'Refine the wording, timing, and details before publishing.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors"
            disabled={isSaving}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="py-4 space-y-4 flex-1 overflow-y-auto pr-1">
          {error && (
            <div className="p-3 bg-danger-subtle border border-danger-border rounded-md flex items-start gap-2 text-xs text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isSent ? (
            <div className="p-3 bg-success-subtle border border-success-border rounded-lg text-xs text-success flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Delivered to <strong>Discord</strong> on {new Date(announcement.sentAt).toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="p-3 bg-surface-muted border border-border rounded-lg text-xs text-content-secondary flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Edit the text below. Nothing is sent to Discord until you explicitly click <strong>Send to Discord</strong>.
              </span>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-content-primary">
                Final Announcement Message
              </label>
              <span
                className={`text-[11px] font-mono ${
                  finalText.length > 5000 ? 'text-danger font-bold' : 'text-content-muted'
                }`}
              >
                {finalText.length.toLocaleString()}/5,000 characters
              </span>
            </div>
            <textarea
              value={finalText}
              onChange={(e) => {
                setFinalText(e.target.value);
                if (fieldError) setFieldError('');
              }}
              rows={10}
              maxLength={5000}
              readOnly={isSent}
              disabled={isSaving}
              className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-surface border rounded-md focus:outline-none focus:ring-1 font-mono leading-relaxed ${
                isSent ? 'bg-surface-muted text-content-secondary cursor-not-allowed' : ''
              } ${
                fieldError
                  ? 'border-danger focus:border-danger focus:ring-danger'
                  : 'border-border focus:border-primary focus:ring-primary'
              }`}
            />
            {fieldError && (
              <p className="text-[11px] text-danger">{fieldError}</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-auto flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => {
              if (onOpenPreview) {
                onOpenPreview({ ...announcement, finalText });
              }
            }}
          >
            Preview Discord Post
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              {isSent ? 'Close' : 'Cancel'}
            </Button>

            {!isSent && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  isLoading={isSaving}
                  disabled={isSaving}
                  onClick={handleSave}
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={<Send className="w-3.5 h-3.5" />}
                  onClick={() => {
                    if (onOpenSend) {
                      onOpenSend({ ...announcement, finalText });
                    }
                  }}
                  disabled={isSaving || !finalText.trim()}
                >
                  Send to Discord
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementEditorModal;
