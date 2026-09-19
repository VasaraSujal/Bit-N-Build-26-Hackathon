import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Search,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';
import RiskExplanationModal from './RiskExplanationModal';
import ResolveRiskModal from './ResolveRiskModal';

const RISK_CODE_LABELS = {
  OVERDUE_TASK: 'Overdue Task',
  BLOCKED_TASK: 'Blocked Task',
  UNASSIGNED_TASK: 'Unassigned Task',
  NO_VOLUNTEERS: 'No Volunteers Assigned',
  LOW_VOLUNTEER_COUNT: 'Low Volunteer Count',
  MULTIPLE_BLOCKED_TASKS: 'Multiple Blocked Tasks'
};

const STATUS_TABS = [
  { id: 'all', label: 'All Risks' },
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' }
];

const SEVERITY_OPTIONS = [
  { id: 'all', label: 'All Severities' },
  { id: 'critical', label: 'Critical' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' }
];

export const EventRisksTab = ({ eventId, canManage }) => {
  const { success, error: toastError } = useToast();
  const [risks, setRisks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('open'); // default to open risks
  const [severityFilter, setSeverityFilter] = useState('all');

  // Modals
  const [explainingRisk, setExplainingRisk] = useState(null);
  const [statusTargetRisk, setStatusTargetRisk] = useState(null);

  const fetchRisks = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`events/${eventId}/risks`);
      setRisks(res.data?.risks || []);
    } catch (err) {
      setError(err.message || 'Unable to load event risks.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  const handleDetectRisks = async () => {
    if (!eventId || isDetecting) return;
    setIsDetecting(true);
    try {
      const res = await api.post(`events/${eventId}/risks/detect`, {});
      const created = res.data?.created ?? 0;
      const resolved = res.data?.resolved ?? 0;
      success(
        res.message || `Risk detection completed. ${created} new/reopened, ${resolved} auto-resolved.`,
        'Risk Engine'
      );
      await fetchRisks();
    } catch (err) {
      toastError(err.message || 'Failed to run risk detection.');
    } finally {
      setIsDetecting(false);
    }
  };

  // Metrics derived from actual risk data
  const metrics = useMemo(() => {
    const total = risks.length;
    const open = risks.filter((r) => r.status === 'open').length;
    const resolved = risks.filter((r) => r.status === 'resolved').length;
    const critical = risks.filter((r) => r.status === 'open' && r.severity === 'critical').length;
    const high = risks.filter((r) => r.status === 'open' && r.severity === 'high').length;
    const medium = risks.filter((r) => r.status === 'open' && r.severity === 'medium').length;
    const low = risks.filter((r) => r.status === 'open' && r.severity === 'low').length;

    return { total, open, resolved, critical, high, medium, low };
  }, [risks]);

  const filteredRisks = useMemo(() => {
    return risks.filter((risk) => {
      const matchesStatus = statusFilter === 'all' || risk.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || risk.severity === severityFilter;
      const q = searchQuery.toLowerCase().trim();
      const codeName = (RISK_CODE_LABELS[risk.riskCode] || risk.riskCode || '').toLowerCase();
      const matchesSearch =
        !q ||
        risk.description.toLowerCase().includes(q) ||
        codeName.includes(q) ||
        (risk.suggestedAction && risk.suggestedAction.toLowerCase().includes(q));

      return matchesStatus && matchesSeverity && matchesSearch;
    });
  }, [risks, statusFilter, severityFilter, searchQuery]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'critical':
        return <Badge variant="danger" size="sm">Critical</Badge>;
      case 'high':
        return <Badge variant="danger" size="sm">High</Badge>;
      case 'medium':
        return <Badge variant="warning" size="sm">Medium</Badge>;
      case 'low':
        return <Badge variant="neutral" size="sm">Low</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{sev}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider block">
            Open Risks
          </span>
          <span className="text-xl font-bold text-content-primary mt-0.5 block">
            {metrics.open}
          </span>
        </Card>

        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-semibold text-danger-text uppercase tracking-wider block">
            Critical
          </span>
          <span className="text-xl font-bold text-danger-text mt-0.5 block">
            {metrics.critical}
          </span>
        </Card>

        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-semibold text-danger-text uppercase tracking-wider block">
            High
          </span>
          <span className="text-xl font-bold text-danger-text mt-0.5 block">
            {metrics.high}
          </span>
        </Card>

        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-semibold text-warning-text uppercase tracking-wider block">
            Medium
          </span>
          <span className="text-xl font-bold text-warning-text mt-0.5 block">
            {metrics.medium}
          </span>
        </Card>

        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider block">
            Low
          </span>
          <span className="text-xl font-bold text-content-primary mt-0.5 block">
            {metrics.low}
          </span>
        </Card>

        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-semibold text-success-text uppercase tracking-wider block">
            Resolved
          </span>
          <span className="text-xl font-bold text-success-text mt-0.5 block">
            {metrics.resolved}
          </span>
        </Card>
      </div>

      {/* Toolbar, Detect Action, and Filters */}
      <div className="space-y-3 bg-surface p-3.5 sm:p-4 border border-border rounded-panel shadow-subtle">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-content-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search risks, actions, or risk codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm text-content-primary bg-white border border-border rounded-lg placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-content-muted hover:text-content-primary text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 justify-between md:justify-end flex-wrap">
            {/* Severity Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="sev-filter" className="text-xs font-semibold text-content-secondary whitespace-nowrap">
                Severity:
              </label>
              <select
                id="sev-filter"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs sm:text-sm text-content-primary bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary"
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Detect Risks Button */}
            {canManage && (
              <Button
                variant="primary"
                size="sm"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin' : ''}`} />}
                onClick={handleDetectRisks}
                isLoading={isDetecting}
                disabled={isDetecting}
              >
                {isDetecting ? 'Detecting...' : 'Detect Risks'}
              </Button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-border no-scrollbar">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-primary text-white shadow-subtle'
                  : 'bg-surface-muted/60 text-content-secondary hover:text-content-primary hover:bg-surface-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Risks Content */}
      {isLoading ? (
        <div className="p-12 bg-surface border border-border rounded-panel flex items-center justify-center">
          <LoadingState message="Loading event risks..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to load risks"
          message={error}
          onRetry={fetchRisks}
        />
      ) : filteredRisks.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="w-6 h-6 text-content-secondary" />}
          title={
            searchQuery || statusFilter !== 'all' || severityFilter !== 'all'
              ? 'No matching risks found'
              : 'No open risks detected'
          }
          description={
            searchQuery || statusFilter !== 'all' || severityFilter !== 'all'
              ? 'No risks match your filter parameters. Try clearing or adjusting the filters.'
              : 'Everything currently looks clear for this event. You can run risk detection at any time to re-evaluate tasks and volunteer staffing.'
          }
          action={
            !searchQuery && statusFilter === 'open' && canManage && (
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={handleDetectRisks}
                isLoading={isDetecting}
              >
                Run Detection Now
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-surface border border-border rounded-panel shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60 text-content-secondary font-semibold">
                    <th className="py-3 px-4">Risk Issue</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Suggested Action</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRisks.map((risk) => {
                    const humanTitle = RISK_CODE_LABELS[risk.riskCode] || risk.riskCode || 'Operational Risk';
                    const isCritical = risk.severity === 'critical' && risk.status === 'open';
                    return (
                      <tr
                        key={risk.id}
                        className={`transition-colors ${
                          isCritical ? 'bg-danger-subtle/20 hover:bg-danger-subtle/30' : 'hover:bg-surface-muted/30'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-content-primary whitespace-nowrap">
                          {humanTitle}
                        </td>

                        <td className="py-3.5 px-4 text-content-secondary max-w-xs">
                          <p className="line-clamp-2">{risk.description}</p>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getSeverityBadge(risk.severity)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge
                            variant={risk.status === 'open' ? 'danger' : 'success'}
                            size="sm"
                          >
                            {risk.status === 'open' ? 'Open' : 'Resolved'}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-content-secondary max-w-xs text-xs">
                          {risk.suggestedAction || <span className="italic text-content-muted">None</span>}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                                onClick={() => setExplainingRisk(risk)}
                              >
                                Explain
                              </Button>
                            )}

                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 px-2 text-xs ${
                                  risk.status === 'open'
                                    ? 'text-success hover:bg-success-subtle'
                                    : 'text-content-secondary'
                                }`}
                                onClick={() => setStatusTargetRisk(risk)}
                              >
                                {risk.status === 'open' ? 'Resolve' : 'Reopen'}
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
          </div>

          {/* Mobile Stacked Card View (320px-430px safe) */}
          <div className="md:hidden space-y-3">
            {filteredRisks.map((risk) => {
              const humanTitle = RISK_CODE_LABELS[risk.riskCode] || risk.riskCode || 'Operational Risk';
              const isCritical = risk.severity === 'critical' && risk.status === 'open';
              return (
                <Card
                  key={risk.id}
                  className={`p-4 space-y-3 ${
                    isCritical ? 'border-danger-border bg-danger-subtle/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-content-primary">
                      {humanTitle}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getSeverityBadge(risk.severity)}
                      <Badge
                        variant={risk.status === 'open' ? 'danger' : 'success'}
                        size="sm"
                      >
                        {risk.status === 'open' ? 'Open' : 'Resolved'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-content-muted">
                    <span>Detected {formatDate(risk.createdAt)}</span>
                  </div>

                  <p className="text-xs text-content-secondary leading-relaxed">
                    {risk.description}
                  </p>

                  {risk.suggestedAction && (
                    <div className="p-2.5 bg-surface-muted/50 border border-border rounded-lg text-xs space-y-0.5">
                      <span className="text-[10px] font-bold text-content-muted uppercase block">
                        Suggested Action:
                      </span>
                      <span className="text-content-primary font-medium block">
                        {risk.suggestedAction}
                      </span>
                    </div>
                  )}

                  {canManage && (
                    <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs h-7 px-2.5"
                        icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                        onClick={() => setExplainingRisk(risk)}
                      >
                        Explain
                      </Button>

                      <Button
                        variant={risk.status === 'open' ? 'primary' : 'secondary'}
                        size="sm"
                        className="text-xs h-7 px-2.5"
                        onClick={() => setStatusTargetRisk(risk)}
                      >
                        {risk.status === 'open' ? 'Resolve' : 'Reopen'}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Risk Explanation Modal */}
      <RiskExplanationModal
        isOpen={Boolean(explainingRisk)}
        onClose={() => setExplainingRisk(null)}
        eventId={eventId}
        risk={explainingRisk}
      />

      {/* Resolve / Reopen Confirmation Modal */}
      <ResolveRiskModal
        isOpen={Boolean(statusTargetRisk)}
        onClose={() => setStatusTargetRisk(null)}
        eventId={eventId}
        risk={statusTargetRisk}
        onSuccess={() => {
          fetchRisks();
        }}
      />
    </div>
  );
};

export default EventRisksTab;
