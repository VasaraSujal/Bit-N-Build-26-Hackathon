import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Plus,
  Search,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  Filter,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Building2
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import CreateDocumentModal from '../components/documents/CreateDocumentModal';
import EditDocumentModal from '../components/documents/EditDocumentModal';
import ViewDocumentModal from '../components/documents/ViewDocumentModal';
import DeleteDocumentModal from '../components/documents/DeleteDocumentModal';

export const Documents = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClubAdmin = user?.role === 'CLUB_ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const initialEventId = searchParams.get('eventId') || 'all';

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [allDocuments, setAllDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);

  const fetchGlobalDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const eventsRes = await api.get('events');
      const loadedEvents = eventsRes.data?.events || [];
      setEvents(loadedEvents);

      if (loadedEvents.length > 0) {
        const docPromises = loadedEvents.map((evt) =>
          api.get(`events/${evt.id}/documents`)
            .then((res) => (res.data?.documents || []).map((doc) => ({
              ...doc,
              eventId: evt.id,
              eventName: evt.name,
              eventClubId: evt.clubId
            })))
            .catch(() => [])
        );

        const docResults = await Promise.all(docPromises);
        setAllDocuments(docResults.flat());
      } else {
        setAllDocuments([]);
      }
    } catch (err) {
      setError(err.message || 'Unable to load documents repository.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalDocuments();
  }, [fetchGlobalDocuments]);

  // Sync search params
  const handleEventFilterChange = (evtId) => {
    setSelectedEventId(evtId);
    if (evtId === 'all') {
      searchParams.delete('eventId');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ eventId: evtId });
    }
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter((doc) => {
      if (selectedEventId !== 'all' && doc.eventId !== selectedEventId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (doc.title || '').toLowerCase().includes(q);
        const eventMatch = (doc.eventName || '').toLowerCase().includes(q);
        const contentMatch = (doc.content || '').toLowerCase().includes(q);
        if (!titleMatch && !eventMatch && !contentMatch) return false;
      }
      return true;
    });
  }, [allDocuments, selectedEventId, searchQuery]);

  const canManageDoc = (doc) => {
    if (!doc) return false;
    if (isSuperAdmin) return true;
    if (isClubAdmin && user?.clubId === doc.eventClubId) return true;
    return false;
  };

  const selectedEventObj = events.find((e) => e.id === selectedEventId);
  const canCreateInSelected = selectedEventId !== 'all' && (
    isSuperAdmin || (isClubAdmin && user?.clubId === selectedEventObj?.clubId)
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
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
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-primary" />
            Document & Knowledge Repository
          </h1>
          <p className="text-xs sm:text-sm text-content-secondary mt-1">
            Browse and manage operational guides, handbooks, and policies powering grounded event AI knowledge.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canCreateInSelected && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsCreateOpen(true)}
            >
              Add Document
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={fetchGlobalDocuments}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border rounded-panel p-4 shadow-subtle flex flex-col md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title, event, or text..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-surface border border-border rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Event Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-content-muted shrink-0" />
          <select
            value={selectedEventId}
            onChange={(e) => handleEventFilterChange(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-surface border border-border rounded-md focus:outline-none focus:border-primary font-medium text-content-primary"
          >
            <option value="all">All Events ({allDocuments.length} docs)</option>
            {events.map((evt) => {
              const count = allDocuments.filter((d) => d.eventId === evt.id).length;
              return (
                <option key={evt.id} value={evt.id}>
                  {evt.name} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-16 bg-surface border border-border rounded-panel">
          <LoadingState message="Loading documents across events..." />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <ErrorState
          title="Unable to load documents"
          message={error}
          onRetry={fetchGlobalDocuments}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && allDocuments.length === 0 && (
        <EmptyState
          title="No documents uploaded yet"
          description="Upload event guidelines, schedules, and handbooks to enable grounded AI question answering."
          actionLabel={events.length > 0 ? 'Go to Events to Add Documents' : undefined}
          onAction={() => (window.location.href = '/app/events')}
        />
      )}

      {/* No Filter Results */}
      {!isLoading && !error && allDocuments.length > 0 && filteredDocuments.length === 0 && (
        <div className="p-10 bg-surface border border-border rounded-panel text-center space-y-3">
          <p className="text-sm font-semibold text-content-primary">
            No documents match the current search or filters.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              handleEventFilterChange('all');
            }}
          >
            Reset Filters
          </Button>
        </div>
      )}

      {/* Documents Table / Card List */}
      {!isLoading && !error && filteredDocuments.length > 0 && (
        <div className="space-y-3">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden bg-surface border border-border rounded-panel shadow-subtle">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-muted/40 text-[11px] font-semibold text-content-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Associated Event</th>
                  <th className="py-3 px-4">Updated / Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs sm:text-sm">
                {filteredDocuments.map((doc) => {
                  const canEditThis = canManageDoc(doc);
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-surface-muted/30 transition-colors group cursor-pointer"
                      onClick={() => setViewingDoc(doc)}
                    >
                      <td className="py-3.5 px-4 font-medium text-content-primary">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold group-hover:text-primary transition-colors">
                            {doc.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-content-secondary" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/app/events/${doc.eventId}?tab=documents`}
                          className="hover:text-primary font-medium flex items-center gap-1 group/link"
                        >
                          <span className="truncate max-w-[200px]">{doc.eventName}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-content-secondary">
                        <div className="flex items-center gap-1.5 text-xs text-content-muted">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(doc.updatedAt || doc.uploadedAt)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => setViewingDoc(doc)}
                            title="View document text"
                          >
                            View
                          </Button>
                          {canEditThis && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Edit2 className="w-3.5 h-3.5" />}
                                onClick={() => setEditingDoc(doc)}
                                title="Edit document"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger hover:bg-danger-subtle hover:text-danger"
                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                onClick={() => setDeletingDoc(doc)}
                                title="Delete document"
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {filteredDocuments.map((doc) => {
              const canEditThis = canManageDoc(doc);
              return (
                <Card
                  key={doc.id}
                  className="p-4 bg-surface hover:border-primary transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex items-start gap-2.5 min-w-0 cursor-pointer"
                      onClick={() => setViewingDoc(doc)}
                    >
                      <div className="w-7 h-7 rounded-md bg-primary-subtle text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-semibold text-content-primary hover:text-primary truncate">
                          {doc.title}
                        </h3>
                        <p className="text-[11px] text-content-secondary mt-0.5 truncate">
                          Event: {doc.eventName}
                        </p>
                        <p className="text-[10px] text-content-muted flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(doc.updatedAt || doc.uploadedAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => setViewingDoc(doc)}
                    >
                      View
                    </Button>
                    {canEditThis && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => setEditingDoc(doc)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger-subtle"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => setDeletingDoc(doc)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedEventId !== 'all' && (
        <CreateDocumentModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          eventId={selectedEventId}
          onSuccess={() => fetchGlobalDocuments()}
        />
      )}

      <EditDocumentModal
        isOpen={Boolean(editingDoc)}
        onClose={() => setEditingDoc(null)}
        eventId={editingDoc?.eventId}
        document={editingDoc}
        onSuccess={() => fetchGlobalDocuments()}
      />

      <ViewDocumentModal
        isOpen={Boolean(viewingDoc)}
        onClose={() => setViewingDoc(null)}
        eventId={viewingDoc?.eventId}
        documentId={viewingDoc?.id}
        canManage={canManageDoc(viewingDoc)}
        onEdit={(doc) => setEditingDoc({ ...doc, eventId: viewingDoc?.eventId })}
      />

      <DeleteDocumentModal
        isOpen={Boolean(deletingDoc)}
        onClose={() => setDeletingDoc(null)}
        eventId={deletingDoc?.eventId}
        document={deletingDoc}
        onSuccess={() => fetchGlobalDocuments()}
      />
    </div>
  );
};

export default Documents;
