import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Clock, Copy, Check, X, Edit2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const ViewDocumentModal = ({ isOpen, onClose, eventId, documentId, canManage, onEdit }) => {
  const { info: toastInfo } = useToast();
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !eventId || !documentId) {
      setDocument(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api.get(`events/${eventId}/documents/${documentId}`)
      .then((res) => {
        if (isMounted) {
          setDocument(res.data?.document || null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Unable to load document details.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, eventId, documentId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!document?.content) return;
    navigator.clipboard.writeText(document.content);
    setCopied(true);
    toastInfo('Document content copied to clipboard.', 'Content Copied');
    setTimeout(() => setCopied(false), 2000);
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface border border-border rounded-panel max-w-3xl w-full p-5 sm:p-6 shadow-panel max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-content-primary truncate">
                {document?.title || (isLoading ? 'Loading document...' : 'Document View')}
              </h2>
              {document && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-content-secondary mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-content-muted" />
                    Updated: {formatDate(document.updatedAt || document.uploadedAt)}
                  </span>
                  <span>•</span>
                  <span>
                    {(document.content || '').length.toLocaleString()} characters
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {document && (
              <Button
                variant="ghost"
                size="sm"
                icon={copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={handleCopy}
                title="Copy text"
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            )}
            {canManage && document && onEdit && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Edit2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  onClose();
                  onEdit(document);
                }}
              >
                Edit
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pt-4 pb-2 pr-1">
          {isLoading && (
            <div className="py-12">
              <LoadingState message="Fetching document content..." />
            </div>
          )}

          {error && (
            <div className="p-4 bg-danger-subtle border border-danger-border rounded-md flex items-start gap-3 text-xs text-danger my-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to load document</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {document && !isLoading && (
            <div className="bg-surface-muted/30 border border-border rounded-lg p-4 sm:p-5">
              <pre className="font-sans text-xs sm:text-sm text-content-primary whitespace-pre-wrap break-words leading-relaxed selection:bg-primary-subtle">
                {document.content}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-auto text-xs text-content-muted">
          <span className="truncate">
            Indexed in event knowledge base for grounded Q&A
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewDocumentModal;
