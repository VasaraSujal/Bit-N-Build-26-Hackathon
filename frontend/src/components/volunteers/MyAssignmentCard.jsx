import React, { useState, useEffect } from 'react';
import { UserCheck, Phone, Calendar, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import { api } from '../../lib/api';

export const MyAssignmentCard = ({ eventId }) => {
  const [assignment, setAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigned, setIsAssigned] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    setIsLoading(true);
    api.get(`events/${eventId}/my-assignment`)
      .then((res) => {
        setAssignment(res.data?.assignment || null);
        setIsAssigned(true);
      })
      .catch((err) => {
        if (err.status === 404) {
          setIsAssigned(false);
          setAssignment(null);
        } else {
          setIsAssigned(false);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [eventId]);

  if (isLoading) {
    return (
      <Card className="p-4 bg-surface-muted/40">
        <LoadingState message="Checking volunteer assignment..." />
      </Card>
    );
  }

  if (!isAssigned || !assignment) {
    return (
      <Card className="p-4 bg-surface border border-dashed border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-surface-muted border border-border flex items-center justify-center text-content-muted shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs sm:text-sm text-content-secondary">
          <strong className="text-content-primary block font-semibold">No Event Assignment</strong>
          You are not currently assigned to an operational volunteer role for this event.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-5 bg-primary-subtle/40 border border-blue-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold text-primary-dark uppercase tracking-wider">
              My Event Responsibility
            </h4>
            <Badge variant="info" size="sm">
              Assigned
            </Badge>
          </div>
          <div className="text-base sm:text-lg font-bold text-content-primary">
            {assignment.responsibility}
          </div>
          {assignment.contact && (
            <div className="text-xs text-content-secondary flex items-center gap-1.5 pt-0.5">
              <Phone className="w-3.5 h-3.5 text-content-muted" />
              <span>Contact: {assignment.contact}</span>
            </div>
          )}
        </div>
        <div className="text-[11px] text-content-muted shrink-0">
          Assigned on {new Date(assignment.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      </div>
    </Card>
  );
};

export default MyAssignmentCard;
