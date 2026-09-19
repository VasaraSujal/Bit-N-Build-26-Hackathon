import React, { useState } from 'react';
import { Send, AlertTriangle, X, CheckCircle2, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const SendAnnouncementModal = ({
  isOpen,
  onClose,
  eventId,
  announcement,
  onSuccess
}) => {
  const { success: toastSuccess } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !announcement) return null;

  const messageText = announcement.finalText || announcement.draftText || '';

  const handleSend = async () => {
    setIsSending(true);
    setError('');

    try {
      const res = await api.post(`events/${eventId}/announcements/${announcement.id}/send`);

      toastSuccess(
        'Announcement successfully published to Discord.',
        'Sent to Discord'
      );

      if (onSuccess) {
        onSuccess(res.data?.data || res.data);
      }
      onClose();
    } catch (err) {
      setError(
        err.message || 'Discord delivery failed. Please check webhook configuration.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface border border-border rounded-panel max-w-lg w-full p-5 sm:p-6 shadow-panel max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-content-primary">
                Send Announcement to Discord?
              </h2>
              <p className="text-xs text-content-secondary">
                Explicit external broadcast confirmation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors"
            disabled={isSending}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-3 flex-1 overflow-y-auto pr-1">
          {error && (
            <div className="p-3 bg-danger-subtle border border-danger-border rounded-md text-xs text-danger">
              {error}
            </div>
          )}

          <div className="p-3 bg-surface-muted rounded-md text-xs text-content-secondary border border-border">
            📢 <strong>External Delivery Notice:</strong> This action will dispatch the message to the configured Discord channel webhook. Once sent, the announcement is marked as sent and cannot be resent.
          </div>

          <div>
            <label className="text-xs font-semibold text-content-primary block mb-1">
              Message Content Preview:
            </label>
            <div className="p-3 bg-[#313338] text-[#dbdee1] rounded-lg text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-[#232428]">
              {messageText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Send className="w-3.5 h-3.5" />}
            isLoading={isSending}
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? 'Sending to Discord...' : 'Confirm & Send to Discord'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SendAnnouncementModal;
