import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  Eye,
  BookOpen,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { api } from '../../lib/api';
import CreateDocumentModal from './CreateDocumentModal';
import EditDocumentModal from './EditDocumentModal';
import ViewDocumentModal from './ViewDocumentModal';
import DeleteDocumentModal from './DeleteDocumentModal';

export const EventDocumentsTab = ({ eventId, canManage, onDocumentCountChange }) => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [viewingDocId, setViewingDocId] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);

  const fetchDocuments = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`events/${eventId}/documents`);
      const docs = res.data?.documents || [];
      setDocuments(docs);
      if (onDocumentCountChange) {
        onDocumentCountChange(docs.length);
      }
    } catch (err) {
      setError(err.message || 'Unable to load event documents.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, onDocumentCountChange]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Client-side case-insensitive filter
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase().trim();
    return documents.filter((doc) => {
      const titleMatch = (doc.title || '').toLowerCase().includes(query);
      const contentMatch = (doc.content || '').toLowerCase().includes(query);
      return titleMatch || contentMatch;
    });
  }, [documents, searchQuery]);

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
    <div className="space-y-4">
      {/* Header and Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-content-primary flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Event Documents & Knowledge Base
          </h2>
          <p className="text-xs text-content-secondary mt-0.5">
            Store and manage operational information indexed into the event's grounded RAG repository.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
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
            onClick={fetchDocuments}
            disabled={isLoading}
            title="Refresh documents list"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents by title or keywords..."
          className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-surface border border-border rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-content-muted hover:text-content-primary"
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 bg-surface border border-border rounded-panel">
          <LoadingState message="Loading event documents..." />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <ErrorState
          title="Unable to load documents"
          message={error}
          onRetry={fetchDocuments}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && documents.length === 0 && (
        <div className="p-8 sm:p-12 bg-surface border border-dashed border-border rounded-panel text-center max-w-md mx-auto space-y-3">
          <div className="w-10 h-10 rounded-full bg-surface-muted border border-border flex items-center justify-center text-content-muted mx-auto">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-content-primary">
            No documents yet
          </h3>
          <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
            Add event information such as guidelines, venue details, schedules, procedures, or planning notes.
          </p>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsCreateOpen(true)}
              className="mt-2"
            >
              Add First Document
            </Button>
          )}
        </div>
      )}

      {/* Search No Results */}
      {!isLoading && !error && documents.length > 0 && filteredDocuments.length === 0 && (
        <div className="p-8 bg-surface border border-border rounded-panel text-center space-y-2">
          <p className="text-xs sm:text-sm font-semibold text-content-primary">
            No documents match "{searchQuery}"
          </p>
          <p className="text-xs text-content-secondary">
            Try adjusting your search terms or clear the filter.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="mt-2"
          >
            Clear Filter
          </Button>
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoading && !error && filteredDocuments.length > 0 && (
        <>
          <div className="hidden md:block overflow-hidden bg-surface border border-border rounded-panel shadow-subtle">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-muted/40 text-[11px] font-semibold text-content-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Updated / Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs sm:text-sm">
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-surface-muted/30 transition-colors group cursor-pointer"
                    onClick={() => setViewingDocId(doc.id)}
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
                          onClick={() => setViewingDocId(doc.id)}
                          title="View document text"
                        >
                          View
                        </Button>
                        {canManage && (
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {filteredDocuments.map((doc) => (
              <Card
                key={doc.id}
                className="p-4 bg-surface hover:border-primary transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex items-start gap-2.5 min-w-0 cursor-pointer"
                    onClick={() => setViewingDocId(doc.id)}
                  >
                    <div className="w-7 h-7 rounded-md bg-primary-subtle text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-semibold text-content-primary hover:text-primary truncate">
                        {doc.title}
                      </h3>
                      <p className="text-[11px] text-content-muted flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        Updated {formatDate(doc.updatedAt || doc.uploadedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => setViewingDocId(doc.id)}
                  >
                    View
                  </Button>
                  {canManage && (
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
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      <CreateDocumentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        eventId={eventId}
        onSuccess={() => fetchDocuments()}
      />

      <EditDocumentModal
        isOpen={Boolean(editingDoc)}
        onClose={() => setEditingDoc(null)}
        eventId={eventId}
        document={editingDoc}
        onSuccess={() => fetchDocuments()}
      />

      <ViewDocumentModal
        isOpen={Boolean(viewingDocId)}
        onClose={() => setViewingDocId(null)}
        eventId={eventId}
        documentId={viewingDocId}
        canManage={canManage}
        onEdit={(doc) => setEditingDoc(doc)}
      />

      <DeleteDocumentModal
        isOpen={Boolean(deletingDoc)}
        onClose={() => setDeletingDoc(null)}
        eventId={eventId}
        document={deletingDoc}
        onSuccess={(deletedId) => {
          setDocuments((prev) => prev.filter((d) => d.id !== deletedId));
          if (onDocumentCountChange) {
            onDocumentCountChange(documents.length - 1);
          }
        }}
      />
    </div>
  );
};

export default EventDocumentsTab;
