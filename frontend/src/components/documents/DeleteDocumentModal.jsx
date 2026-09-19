import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const DeleteDocumentModal = ({ isOpen, onClose, eventId, document, onSuccess }) => {
  const { info: toastInfo } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !document) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      await api.delete(`events/${eventId}/documents/${document.id}`);

      toastInfo(`"${document.title}" has been removed from event knowledge.`, 'Document Deleted');

      if (onSuccess) {
        onSuccess(document.id);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface border border-border rounded-panel max-w-md w-full p-5 sm:p-6 shadow-panel">
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-danger-subtle text-danger flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-content-primary">Delete Document</h2>
              <p className="text-xs text-content-secondary">This action cannot be undone.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors"
            disabled={isDeleting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          {error && (
            <div className="p-3 bg-danger-subtle border border-danger-border rounded-md text-xs text-danger">
              {error}
            </div>
          )}

          <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
            Are you sure you want to delete <strong className="text-content-primary font-semibold">"{document.title}"</strong>?
          </p>
          <div className="p-3 bg-surface-muted rounded-md text-xs text-content-secondary border border-border">
            ⚠️ This document will no longer be available to the event knowledge repository or indexed in AI question answering.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            isLoading={isDeleting}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Document'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteDocumentModal;
