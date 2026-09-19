import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Clock,
  Filter,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import RiskExplanationModal from '../components/risks/RiskExplanationModal';
import ResolveRiskModal from '../components/risks/ResolveRiskModal';

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

export const Risks = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClubAdmin = user?.role === 'CLUB_ADMIN';

  const [events, setEvents] = useState([]);
  const [allRisks, setAllRisks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('open'); // default open
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedEventId, setSelectedEventId] = useState('all');

  // Modals
  const [explainingRisk, setExplainingRisk] = useState(null);
  const [statusTargetRisk, setStatusTargetRisk] = useState(null);

  const fetchGlobalRisks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch accessible events
      const eventsRes = await api.get('events');
      const loadedEvents = eventsRes.data?.events || [];
      setEvents(loadedEvents);

      // 2. Fetch risks for each event in parallel
      if (loadedEvents.length > 0) {
        const riskPromises = loadedEvents.map((evt) =>
          api.get(`events/${evt.id}/risks`)
            .then((res) => (res.data?.risks || []).map((r) => ({ ...r, eventName: evt.name, eventClubId: evt.clubId })))
            .catch(() => [])
        );

        const riskResults = await Promise.all(riskPromises);
        const flattened = riskResults.flat();
        setAllRisks(flattened);
      } else {
        setAllRisks([]);
      }
    } catch (err) {
      setError(err.message || 'Unable to load risk board.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalRisks();
  }, [fetchGlobalRisks]);

  const eventMap = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      map[e.id] = e.name;
    });
    return map;
  }, [events]);

  const metrics = useMemo(() => {
    const total = allRisks.length;
    const open = allRisks.filter((r) => r.status === 'open').length;
    const resolved = allRisks.filter((r) => r.status === 'resolved').length;
    const critical = allRisks.filter((r) => r.status === 'open' && r.severity === 'critical').length;
    const high = allRisks.filter((r) => r.status === 'open' && r.severity === 'high').length;
    const medium = allRisks.filter((r) => r.status === 'open' && r.severity === 'medium').length;
    const low = allRisks.filter((r) => r.status === 'open' && r.severity === 'low').length;

    return { total, open, resolved, critical, high, medium, low };
  }, [allRisks]);

  const filteredRisks = useMemo(() => {
    return allRisks.filter((risk) => {
      const matchesEvent = selectedEventId === 'all' || risk.eventId === selectedEventId;
      const matchesStatus = statusFilter === 'all' || risk.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || risk.severity === severityFilter;

      const q = searchQuery.toLowerCase().trim();
      const eventName = (risk.eventName || '').toLowerCase();
      const codeName = (RISK_CODE_LABELS[risk.riskCode] || risk.riskCode || '').toLowerCase();
      const matchesSearch =
        !q ||
        risk.description.toLowerCase().includes(q) ||
        eventName.includes(q) ||
        codeName.includes(q) ||
        (risk.suggestedAction && risk.suggestedAction.toLowerCase().includes(q));

      return matchesEvent && matchesStatus && matchesSeverity && matchesSearch;
    });
  }, [allRisks, selectedEventId, statusFilter, severityFilter, searchQuery]);

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

  const canManageEventRisk = (risk) => {
    if (isSuperAdmin) return true;
    if (isClubAdmin && user?.clubId === risk.eventClubId) return true;
    return false;
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
              Operational Risk Engine
            </h1>
            <Badge variant="neutral" size="sm">
              {isSuperAdmin ? 'Global Governance' : 'Club Scope'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-content-secondary">
            Deterministic risk detection and AI root-cause mitigation analysis for event execution.
          </p>
        </div>
      </div>

      {/* Summary Metric Cards */}
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

      {/* Toolbar & Filters */}
      <div className="space-y-3 bg-surface p-3.5 sm:p-4 border border-border rounded-panel shadow-subtle">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-content-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search risks, events, or actions..."
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

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Event Filter */}
            {events.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="event-filter" className="text-xs font-semibold text-content-secondary whitespace-nowrap">
                  Event:
                </label>
                <select
                  id="event-filter"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs sm:text-sm text-content-primary bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary max-w-[180px] truncate"
                >
                  <option value="all">All Events ({events.length})</option>
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Severity Filter */}
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

      {/* Risks Body */}
      {isLoading ? (
        <div className="p-12 bg-surface border border-border rounded-panel flex items-center justify-center">
          <LoadingState message="Loading risk engine records..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to load risks"
          message={error}
          onRetry={fetchGlobalRisks}
        />
      ) : filteredRisks.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="w-6 h-6 text-content-secondary" />}
          title={
            searchQuery || statusFilter !== 'all' || severityFilter !== 'all' || selectedEventId !== 'all'
              ? 'No matching risks found'
              : 'No operational risks detected'
          }
          description="Everything currently looks clear across your events. Run risk detection inside event details to re-evaluate conditions."
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
                    <th className="py-3 px-4">Event</th>
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
                    const canManage = canManageEventRisk(risk);
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

                        <td className="py-3.5 px-4">
                          <Link
                            to={`/app/events/${risk.eventId}`}
                            className="text-primary hover:underline font-semibold text-xs inline-flex items-center gap-1"
                          >
                            <span>{risk.eventName || eventMap[risk.eventId] || 'Event'}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </Link>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                              onClick={() => setExplainingRisk(risk)}
                            >
                              Explain
                            </Button>

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
              const canManage = canManageEventRisk(risk);
              return (
                <Card
                  key={risk.id}
                  className={`p-4 space-y-3 ${
                    isCritical ? 'border-danger-border bg-danger-subtle/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-sm font-bold text-content-primary block">
                        {humanTitle}
                      </span>
                      <Link
                        to={`/app/events/${risk.eventId}`}
                        className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1 mt-0.5"
                      >
                        <span>{risk.eventName || eventMap[risk.eventId] || 'Event'}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </Link>
                    </div>
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

                    {canManage && (
                      <Button
                        variant={risk.status === 'open' ? 'primary' : 'secondary'}
                        size="sm"
                        className="text-xs h-7 px-2.5"
                        onClick={() => setStatusTargetRisk(risk)}
                      >
                        {risk.status === 'open' ? 'Resolve' : 'Reopen'}
                      </Button>
                    )}
                  </div>
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
        eventId={explainingRisk?.eventId}
        risk={explainingRisk}
      />

      {/* Resolve / Reopen Confirmation Modal */}
      <ResolveRiskModal
        isOpen={Boolean(statusTargetRisk)}
        onClose={() => setStatusTargetRisk(null)}
        eventId={statusTargetRisk?.eventId}
        risk={statusTargetRisk}
        onSuccess={() => {
          fetchGlobalRisks();
        }}
      />
    </div>
  );
};

export default Risks;
