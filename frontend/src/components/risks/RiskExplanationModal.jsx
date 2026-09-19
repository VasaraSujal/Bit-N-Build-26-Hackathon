import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import { api } from '../../lib/api';

const RISK_CODE_LABELS = {
  OVERDUE_TASK: 'Overdue Task',
  BLOCKED_TASK: 'Blocked Task',
  UNASSIGNED_TASK: 'Unassigned Task',
  NO_VOLUNTEERS: 'No Volunteers Assigned',
  LOW_VOLUNTEER_COUNT: 'Low Volunteer Count',
  MULTIPLE_BLOCKED_TASKS: 'Multiple Blocked Tasks'
};

export const RiskExplanationModal = ({
  isOpen,
  onClose,
  eventId,
  risk
}) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && risk && eventId) {
      setData(null);
      setError(null);
      setIsLoading(true);

      api.post(`events/${eventId}/risks/${risk.id}/explain`, {})
        .then((res) => {
          setData(res.data || null);
        })
        .catch((err) => {
          setError(err.message || 'Unable to generate operational explanation.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, risk, eventId]);

  if (!risk) return null;

  const humanTitle = RISK_CODE_LABELS[risk.riskCode] || risk.riskCode || 'Operational Risk';

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'critical':
        return <Badge variant="danger" size="sm">CRITICAL</Badge>;
      case 'high':
        return <Badge variant="danger" size="sm">HIGH</Badge>;
      case 'medium':
        return <Badge variant="warning" size="sm">MEDIUM</Badge>;
      case 'low':
        return <Badge variant="neutral" size="sm">LOW</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{sev?.toUpperCase()}</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Operational Risk Analysis"
      description="Automated root cause breakdown and recommended operational mitigations."
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Header Summary */}
        <div className="p-3.5 bg-surface-muted/60 border border-border rounded-lg space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-content-primary">
              {humanTitle}
            </span>
            {getSeverityBadge(risk.severity)}
          </div>
          <p className="text-xs text-content-secondary leading-relaxed">
            {risk.description}
          </p>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="p-8 text-center bg-surface border border-border rounded-lg">
            <LoadingState message="Generating operational breakdown..." />
          </div>
        ) : error ? (
          <div className="p-4 bg-danger-subtle border border-danger-border rounded-lg text-xs text-danger-text">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-3.5 text-xs sm:text-sm">
            {/* 1. Why is this a risk? */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                Why is this a risk?
              </h4>
              <div className="p-3 bg-white border border-border rounded-lg text-content-secondary leading-relaxed">
                {data.explanation}
              </div>
            </div>

            {/* 2. Potential Impact */}
            {data.impact && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  Operational Impact
                </h4>
                <div className="p-3 bg-white border border-border rounded-lg text-content-secondary leading-relaxed">
                  {data.impact}
                </div>
              </div>
            )}

            {/* 3. Recommended Action */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-success" />
                Recommended Action
              </h4>
              <div className="p-3 bg-success-subtle/30 border border-success-border rounded-lg text-content-primary leading-relaxed font-medium">
                {data.recommendedAction || risk.suggestedAction || 'Review event operations and resolve pending items.'}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};

export default RiskExplanationModal;
