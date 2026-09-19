import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  BookOpen,
  FileText,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';
import ViewDocumentModal from '../documents/ViewDocumentModal';

const SAMPLE_QUERIES = [
  'What is the registration process and schedule?',
  'Where should volunteers report and at what time?',
  'What are the venue access and entry guidelines?',
  'Who is responsible for stage management and operations?'
];

export const EventKnowledgeTab = ({ eventId, canManage, onNavigateToDocuments }) => {
  const { success: toastSuccess } = useToast();
  const [question, setQuestion] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  
  // Current active Q&A response
  const [activeResult, setActiveResult] = useState(null);

  // In-memory query session history
  const [history, setHistory] = useState([]);

  // Document viewer modal
  const [viewingDocId, setViewingDocId] = useState(null);

  const handleQuery = async (queryText) => {
    const textToQuery = (queryText || question).trim();
    if (!textToQuery) {
      setError('Please enter a question to query the event repository.');
      return;
    }

    if (textToQuery.length > 1000) {
      setError('Question cannot exceed 1,000 characters.');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const res = await api.post(`ai/events/${eventId}/knowledge/query`, {
        question: textToQuery
      });

      const data = res.data?.data || res.data;
      const resultObj = {
        id: Date.now().toString(),
        question: data.question || textToQuery,
        answer: data.answer || 'No answer generated.',
        sources: Array.isArray(data.sources) ? data.sources : [],
        timestamp: new Date().toISOString()
      };

      setActiveResult(resultObj);
      setHistory((prev) => [resultObj, ...prev.slice(0, 9)]); // Keep last 10 queries
      setQuestion('');

      toastSuccess('Response synthesized from event knowledge repository.', 'Answer Retrieved');
    } catch (err) {
      setError(
        err.message || 'The knowledge service is temporarily unavailable. Please try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const isNoContextRefusal = (result) => {
    if (!result) return false;
    const ans = (result.answer || '').toLowerCase();
    return (
      (!result.sources || result.sources.length === 0) &&
      (ans.includes('could not find enough information') ||
        ans.includes('couldn\'t find enough information') ||
        ans.includes('insufficient') ||
        ans.includes('no relevant'))
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Knowledge Assistant Header Card */}
      <div className="bg-surface border border-border rounded-panel p-5 sm:p-6 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-content-primary">
                  Event Knowledge Base & Grounded Q&A
                </h2>
                <Badge variant="info" size="sm">
                  RAG Grounded
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-content-secondary mt-0.5">
                Ask operational questions about this event. Answers are synthesized exclusively from uploaded event documents.
              </p>
            </div>
          </div>

          {onNavigateToDocuments && (
            <Button
              variant="secondary"
              size="sm"
              icon={<BookOpen className="w-3.5 h-3.5" />}
              onClick={onNavigateToDocuments}
              className="shrink-0"
            >
              Manage Documents
            </Button>
          )}
        </div>

        {/* Input Query Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleQuery();
          }}
          className="space-y-3 pt-2"
        >
          {error && (
            <div className="p-3 bg-danger-subtle border border-danger-border rounded-md flex items-start gap-2.5 text-xs text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-content-primary flex items-center justify-between">
              <span>Ask a question about this event</span>
              <span className="text-[11px] text-content-muted font-normal">
                {question.length}/1,000 characters
              </span>
            </label>
            <textarea
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleQuery();
                }
              }}
              placeholder="e.g. What time does volunteer check-in begin? What are the parking guidelines?"
              rows={3}
              maxLength={1000}
              disabled={isSearching}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-surface border border-border rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>

          {/* Quick Suggestions */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-content-muted uppercase tracking-wider block">
              Suggested queries
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_QUERIES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuestion(sample);
                    handleQuery(sample);
                  }}
                  disabled={isSearching}
                  className="px-2.5 py-1 text-xs bg-surface-muted border border-border rounded-md text-content-secondary hover:text-primary hover:border-primary transition-colors text-left truncate max-w-full"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-content-muted flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>Grounded in indexed event repository documents</span>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSearching}
              disabled={isSearching || !question.trim()}
              icon={<Search className="w-3.5 h-3.5" />}
            >
              {isSearching ? 'Searching event knowledge...' : 'Ask Knowledge Base'}
            </Button>
          </div>
        </form>
      </div>

      {/* Loading Search State */}
      {isSearching && (
        <Card className="p-6 sm:p-8 bg-surface border border-border text-center space-y-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-primary-subtle text-primary flex items-center justify-center mx-auto">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </div>
          <h3 className="text-sm font-bold text-content-primary">
            Searching event knowledge repository...
          </h3>
          <p className="text-xs text-content-secondary max-w-md mx-auto">
            Scanning document corpus, ranking relevant context, and synthesizing a grounded response.
          </p>
        </Card>
      )}

      {/* Grounded Answer Panel */}
      {!isSearching && activeResult && (
        <div className="space-y-4 animate-fadeIn">
          <Card className="p-5 sm:p-6 bg-surface border border-border shadow-subtle space-y-4">
            {/* Question Bar */}
            <div className="pb-3 border-b border-border flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  Question
                </span>
                <p className="text-sm sm:text-base font-semibold text-content-primary">
                  {activeResult.question}
                </p>
              </div>
              <Badge variant="neutral" size="sm" icon={<Clock className="w-3 h-3 text-content-muted" />}>
                Just now
              </Badge>
            </div>

            {/* Answer Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Answer
                </span>
                <span className="text-[11px] font-medium text-success bg-success-subtle px-2 py-0.5 rounded border border-success-border">
                  Grounded in event documents
                </span>
              </div>

              {/* Check if refusal / no context */}
              {isNoContextRefusal(activeResult) ? (
                <div className="p-4 bg-surface-muted border border-border rounded-lg space-y-3">
                  <div className="flex items-start gap-2.5 text-xs sm:text-sm text-content-secondary leading-relaxed">
                    <HelpCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <span>{activeResult.answer}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                    {onNavigateToDocuments && canManage && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FileText className="w-3.5 h-3.5" />}
                        onClick={onNavigateToDocuments}
                      >
                        Add Relevant Document
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveResult(null);
                        setQuestion('');
                      }}
                    >
                      Ask Another Question
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-surface-muted/40 border border-border rounded-lg text-xs sm:text-sm text-content-primary leading-relaxed whitespace-pre-wrap">
                  {activeResult.answer}
                </div>
              )}
            </div>

            {/* Verified Sources List */}
            {activeResult.sources && activeResult.sources.length > 0 && (
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-content-muted" />
                    Sources & Document References ({activeResult.sources.length})
                  </span>
                  <span className="text-[11px] text-content-muted">
                    Click to inspect source text
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeResult.sources.map((src, i) => (
                    <button
                      key={src.documentId || i}
                      onClick={() => setViewingDocId(src.documentId)}
                      className="p-2.5 bg-surface border border-border hover:border-primary rounded-lg text-left transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-primary-subtle text-primary font-bold text-[11px] flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-content-primary group-hover:text-primary transition-colors truncate">
                            {src.title || 'Event Document'}
                          </p>
                          <span className="text-[10px] text-content-muted font-mono block truncate">
                            ID: {src.documentId}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-content-muted group-hover:text-primary transition-colors shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Session History (Optional UX convenience) */}
      {history.length > 1 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-content-muted" />
              Previous Questions in Session ({history.length})
            </h3>
            <button
              onClick={() => setHistory([])}
              className="text-[11px] text-content-muted hover:text-content-primary"
            >
              Clear Session
            </button>
          </div>

          <div className="space-y-2">
            {history.slice(1).map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveResult(item)}
                className="p-3 bg-surface border border-border hover:border-primary rounded-panel cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-content-primary truncate">
                    {item.question}
                  </p>
                  <p className="text-content-secondary truncate text-[11px] mt-0.5">
                    {item.answer}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.sources?.length > 0 && (
                    <Badge variant="neutral" size="sm">
                      {item.sources.length} {item.sources.length === 1 ? 'source' : 'sources'}
                    </Badge>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-content-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document View Modal */}
      <ViewDocumentModal
        isOpen={Boolean(viewingDocId)}
        onClose={() => setViewingDocId(null)}
        eventId={eventId}
        documentId={viewingDocId}
        canManage={canManage}
      />
    </div>
  );
};

export default EventKnowledgeTab;
