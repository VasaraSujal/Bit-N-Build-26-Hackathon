import React, { useState } from 'react';
import { FileText, AlertCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

export const CreateDocumentModal = ({ isOpen, onClose, eventId, onSuccess }) => {
  const { success: toastSuccess } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!title.trim()) {
      errs.title = 'Document title is required.';
    } else if (title.trim().length > 255) {
      errs.title = 'Title cannot exceed 255 characters.';
    }

    if (!content.trim()) {
      errs.content = 'Document content is required.';
    } else if (content.trim().length > 50000) {
      errs.content = 'Content cannot exceed 50,000 characters.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.post(`events/${eventId}/documents`, {
        title: title.trim(),
        content: content.trim()
      });

      toastSuccess('Document has been added to the event knowledge repository.', 'Document Added');

      if (onSuccess) {
        onSuccess(res.data?.document);
      }
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to create document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setError('');
    setFieldErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface border border-border rounded-panel max-w-2xl w-full p-5 sm:p-6 shadow-panel max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-subtle text-primary flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-content-primary">Add Event Document</h2>
              <p className="text-xs text-content-secondary">
                Document will be indexed for the event's grounded AI knowledge repository.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 flex-1 overflow-y-auto pr-1">
          {error && (
            <div className="p-3 bg-danger-subtle border border-danger-border rounded-md flex items-start gap-2.5 text-xs text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-content-primary">
                Document Title <span className="text-danger">*</span>
              </label>
              <span className="text-[11px] text-content-muted">
                {title.length}/255
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="e.g. Venue Guidelines, Registration Protocol, Staff Schedule"
              className={`w-full px-3 py-2 text-sm bg-surface border rounded-md focus:outline-none focus:ring-1 ${
                fieldErrors.title
                  ? 'border-danger focus:border-danger focus:ring-danger'
                  : 'border-border focus:border-primary focus:ring-primary'
              }`}
              maxLength={255}
              disabled={isSubmitting}
            />
            {fieldErrors.title && (
              <p className="text-[11px] text-danger">{fieldErrors.title}</p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-content-primary">
                Document Content <span className="text-danger">*</span>
              </label>
              <span className="text-[11px] text-content-muted">
                {content.length.toLocaleString()}/50,000
              </span>
            </div>
            <p className="text-[11px] text-content-secondary">
              Paste or type instructions, rules, operational timelines, or handbook sections. Plain text will be preserved with exact line breaks.
            </p>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (fieldErrors.content) setFieldErrors((prev) => ({ ...prev, content: '' }));
              }}
              placeholder="Enter comprehensive event information, policies, guidelines, or venue details..."
              rows={10}
              className={`w-full px-3 py-2 text-sm bg-surface border rounded-md focus:outline-none focus:ring-1 font-mono text-xs leading-relaxed ${
                fieldErrors.content
                  ? 'border-danger focus:border-danger focus:ring-danger'
                  : 'border-border focus:border-primary focus:ring-primary'
              }`}
              maxLength={50000}
              disabled={isSubmitting}
            />
            {fieldErrors.content && (
              <p className="text-[11px] text-danger">{fieldErrors.content}</p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Add Document'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDocumentModal;
