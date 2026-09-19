import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Sparkles,
  Plus,
  Send,
  Eye,
  Edit2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Lock
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { api } from '../../lib/api';
import AnnouncementGeneratorModal from './AnnouncementGeneratorModal';
import AnnouncementEditorModal from './AnnouncementEditorModal';
import AnnouncementPreviewModal from './AnnouncementPreviewModal';
import SendAnnouncementModal from './SendAnnouncementModal';

export const EventAnnouncementsTab = ({
  eventId,
  eventName,
  canManage,
  onAnnouncementCountChange
}) => {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [previewingAnnouncement, setPreviewingAnnouncement] = useState(null);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(null);

  const fetchAnnouncements = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`events/${eventId}/announcements`);
      const list = res.data?.data?.announcements || res.data?.announcements || [];
      setAnnouncements(list);
      if (onAnnouncementCountChange) {
        onAnnouncementCountChange(list.length);
      }
    } catch (err) {
      setError(err.message || 'Unable to load announcements.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, onAnnouncementCountChange]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (ann) => {
    if (ann.status === 'sent' || Boolean(ann.sentAt)) {
      return (
        <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
          Sent
        </Badge>
      );
    }
    return (
      <Badge variant="warning" size="sm" icon={<Clock className="w-3 h-3" />}>
        Draft
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-content-primary flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Event Announcements & Discord Broadcasts
          </h2>
          <p className="text-xs text-content-secondary mt-0.5">
            Generate formatted announcements with AI, review and edit drafts, and publish to your Discord channel.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={() => setIsGeneratorOpen(true)}
            >
              Generate with AI
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={fetchAnnouncements}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 bg-surface border border-border rounded-panel">
          <LoadingState message="Loading event announcements..." />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <ErrorState
          title="Unable to load announcements"
          message={error}
          onRetry={fetchAnnouncements}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && announcements.length === 0 && (
        <div className="p-8 sm:p-12 bg-surface border border-dashed border-border rounded-panel text-center max-w-md mx-auto space-y-3">
          <div className="w-10 h-10 rounded-full bg-surface-muted border border-border flex items-center justify-center text-content-muted mx-auto">
            <Megaphone className="w-5 h-5" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-content-primary">
            No announcements yet
          </h3>
          <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
            Create structured announcements for schedule updates, registration reminders, and guidelines to broadcast on Discord.
          </p>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={() => setIsGeneratorOpen(true)}
              className="mt-2"
            >
              Generate First Announcement
            </Button>
          )}
        </div>
      )}

      {/* Announcements List */}
      {!isLoading && !error && announcements.length > 0 && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden bg-surface border border-border rounded-panel shadow-subtle">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-muted/40 text-[11px] font-semibold text-content-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Message Content Preview</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Created / Sent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs sm:text-sm">
                {announcements.map((ann) => {
                  const isSent = ann.status === 'sent' || Boolean(ann.sentAt);
                  const displayMessage = ann.finalText || ann.draftText || '';
                  return (
                    <tr
                      key={ann.id}
                      className="hover:bg-surface-muted/30 transition-colors group cursor-pointer"
                      onClick={() => setEditingAnnouncement(ann)}
                    >
                      <td className="py-3.5 px-4 font-medium text-content-primary max-w-md">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-primary-subtle text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <Megaphone className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-content-primary truncate group-hover:text-primary transition-colors">
                              {displayMessage.split('\n')[0] || 'Announcement'}
                            </p>
                            <p className="text-xs text-content-secondary line-clamp-1 mt-0.5">
                              {displayMessage}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(ann)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="neutral" size="sm" icon={<MessageSquare className="w-3 h-3 text-[#5865f2]" />}>
                          {ann.channel || 'Discord'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-content-secondary whitespace-nowrap text-xs">
                        {isSent ? (
                          <div>
                            <span className="font-medium text-content-primary block">
                              Sent: {formatDate(ann.sentAt)}
                            </span>
                            <span className="text-[11px] text-content-muted">
                              Created: {formatDate(ann.createdAt)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-content-muted">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Created: {formatDate(ann.createdAt)}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => setPreviewingAnnouncement(ann)}
                            title="Preview Discord appearance"
                          >
                            Preview
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            icon={isSent ? <Lock className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                            onClick={() => setEditingAnnouncement(ann)}
                            title={isSent ? 'View sent announcement' : 'Edit announcement'}
                          >
                            {isSent ? 'View' : 'Edit'}
                          </Button>

                          {!isSent && canManage && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Send className="w-3.5 h-3.5" />}
                              onClick={() => setSendingAnnouncement(ann)}
                            >
                              Send
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {announcements.map((ann) => {
              const isSent = ann.status === 'sent' || Boolean(ann.sentAt);
              const displayMessage = ann.finalText || ann.draftText || '';
              return (
                <Card
                  key={ann.id}
                  className="p-4 bg-surface hover:border-primary transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-primary-subtle text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Megaphone className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getStatusBadge(ann)}
                          <span className="text-[11px] text-content-muted">
                            Channel: {ann.channel || 'Discord'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-content-primary mt-1 line-clamp-2">
                          {displayMessage}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-content-muted flex items-center justify-between pt-1 border-t border-border">
                    <span>
                      {isSent ? `Sent: ${formatDate(ann.sentAt)}` : `Created: ${formatDate(ann.createdAt)}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => setPreviewingAnnouncement(ann)}
                    >
                      Preview
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={isSent ? <Lock className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => setEditingAnnouncement(ann)}
                    >
                      {isSent ? 'View' : 'Edit'}
                    </Button>

                    {!isSent && canManage && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Send className="w-3.5 h-3.5" />}
                        onClick={() => setSendingAnnouncement(ann)}
                      >
                        Send
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Generator Modal */}
      <AnnouncementGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        eventId={eventId}
        onSuccess={() => fetchAnnouncements()}
      />

      {/* Editor Modal */}
      <AnnouncementEditorModal
        isOpen={Boolean(editingAnnouncement)}
        onClose={() => setEditingAnnouncement(null)}
        eventId={eventId}
        announcement={editingAnnouncement}
        onSuccess={() => fetchAnnouncements()}
        onOpenPreview={(ann) => {
          setEditingAnnouncement(null);
          setPreviewingAnnouncement(ann);
        }}
        onOpenSend={(ann) => {
          setEditingAnnouncement(null);
          setSendingAnnouncement(ann);
        }}
      />

      {/* Preview Modal */}
      <AnnouncementPreviewModal
        isOpen={Boolean(previewingAnnouncement)}
        onClose={() => setPreviewingAnnouncement(null)}
        announcement={previewingAnnouncement}
        eventName={eventName}
        canManage={canManage}
        onOpenSendModal={(ann) => setSendingAnnouncement(ann)}
      />

      {/* Send Confirmation Modal */}
      <SendAnnouncementModal
        isOpen={Boolean(sendingAnnouncement)}
        onClose={() => setSendingAnnouncement(null)}
        eventId={eventId}
        announcement={sendingAnnouncement}
        onSuccess={() => fetchAnnouncements()}
      />
    </div>
  );
};

export default EventAnnouncementsTab;
