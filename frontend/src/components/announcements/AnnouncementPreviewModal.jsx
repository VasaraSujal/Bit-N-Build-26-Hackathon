import React from 'react';
import { Send, Eye, X, MessageSquare, ExternalLink, Bot } from 'lucide-react';
import { Button } from '../ui/Button';

export const AnnouncementPreviewModal = ({
  isOpen,
  onClose,
  announcement,
  eventName,
  onOpenSendModal,
  canManage
}) => {
  if (!isOpen || !announcement) return null;

  const messageText = announcement.finalText || announcement.draftText || '';
  const isSent = announcement.status === 'sent' || Boolean(announcement.sentAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface border border-border rounded-panel max-w-2xl w-full p-5 sm:p-6 shadow-panel max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-content-primary">
                Discord Message Preview
              </h2>
              <p className="text-xs text-content-secondary">
                Simulated appearance in your Discord channel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Discord Simulation Body */}
        <div className="py-4 space-y-3 flex-1 overflow-y-auto pr-1">
          {/* Discord Channel Header Mock */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2b2d31] rounded-t-md text-xs font-semibold text-[#949ba4] border-b border-[#1f2023]">
            <span className="text-[#80848e] font-bold">#</span>
            <span className="text-white">announcements</span>
            <span className="text-[11px] text-[#949ba4] font-normal ml-auto">
              {eventName || 'Event Channel'}
            </span>
          </div>

          {/* Discord Message View */}
          <div className="p-4 bg-[#313338] rounded-b-md text-[#dbdee1] space-y-2 border border-t-0 border-[#232428]">
            <div className="flex items-start gap-3">
              {/* Bot Avatar */}
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white shrink-0 font-bold text-xs mt-0.5 shadow-sm">
                <Bot className="w-5 h-5" />
              </div>

              {/* Bot Details and Content */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white text-xs hover:underline cursor-pointer">
                    ClubOps AI
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#5865f2] text-white uppercase tracking-wider">
                    BOT
                  </span>
                  <span className="text-[11px] text-[#949ba4]">
                    Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Message Body */}
                <div className="text-xs sm:text-sm text-[#dbdee1] whitespace-pre-wrap break-words leading-relaxed pt-1 font-sans selection:bg-[#5865f2]/40">
                  {messageText || <span className="italic text-[#80848e]">No announcement text.</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Preview
          </Button>

          {!isSent && canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Send className="w-3.5 h-3.5" />}
              onClick={() => {
                onClose();
                if (onOpenSendModal) onOpenSendModal(announcement);
              }}
            >
              Proceed to Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPreviewModal;
