import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Calendar,
  UserCheck
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { api } from '../../lib/api';
import { useAuth } from '../../context/useAuth';
import AddVolunteerModal from './AddVolunteerModal';
import EditVolunteerModal from './EditVolunteerModal';
import RemoveVolunteerModal from './RemoveVolunteerModal';
import MyAssignmentCard from './MyAssignmentCard';

export const EventVolunteersTab = ({ eventId, clubId, canManage }) => {
  const { user } = useAuth();
  const isVolunteer = user?.role === 'VOLUNTEER';

  const [volunteers, setVolunteers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [removingVolunteer, setRemovingVolunteer] = useState(null);

  const fetchVolunteers = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`events/${eventId}/volunteers`);
      setVolunteers(res.data?.volunteers || []);
    } catch (err) {
      setError(err.message || 'Unable to load event volunteers.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  const filteredVolunteers = useMemo(() => {
    if (!searchQuery.trim()) return volunteers;
    const q = searchQuery.toLowerCase().trim();
    return volunteers.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.responsibility.toLowerCase().includes(q) ||
        (v.contact && v.contact.toLowerCase().includes(q))
    );
  }, [volunteers, searchQuery]);

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
    <div className="space-y-5">
      {/* Volunteer Personal Assignment Banner */}
      {isVolunteer && <MyAssignmentCard eventId={eventId} />}

      {/* Toolbar & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface p-3.5 sm:p-4 border border-border rounded-panel shadow-subtle">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-content-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search volunteers by name, email, or responsibility..."
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

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <span className="text-xs text-content-secondary">
            <strong className="text-content-primary">{volunteers.length}</strong> {volunteers.length === 1 ? 'volunteer' : 'volunteers'} assigned
          </span>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddOpen(true)}
            >
              Add Volunteer
            </Button>
          )}
        </div>
      </div>

      {/* Volunteers Roster Content */}
      {isLoading ? (
        <div className="p-12 bg-surface border border-border rounded-panel flex items-center justify-center">
          <LoadingState message="Loading event volunteer roster..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to load volunteers"
          message={error}
          onRetry={fetchVolunteers}
        />
      ) : filteredVolunteers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6 text-content-secondary" />}
          title={searchQuery ? 'No matching volunteers' : 'No volunteers assigned yet'}
          description={
            searchQuery
              ? `No volunteers match "${searchQuery}". Try searching with a different term.`
              : canManage
              ? 'Assign club members with specific event duties to coordinate event operations.'
              : 'There are currently no volunteers assigned to this event.'
          }
          action={
            !searchQuery && canManage && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsAddOpen(true)}
              >
                Add First Volunteer
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-surface border border-border rounded-panel shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60 text-content-secondary font-semibold">
                    <th className="py-3 px-4">Volunteer</th>
                    <th className="py-3 px-4">Responsibility</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Assigned On</th>
                    {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredVolunteers.map((vol) => (
                    <tr key={vol.id} className="hover:bg-surface-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-content-primary">
                        <div>
                          <span>{vol.name}</span>
                          <span className="block text-xs font-normal text-content-secondary font-mono mt-0.5">
                            {vol.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="info" size="sm">
                          {vol.responsibility}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-content-secondary">
                        {vol.contact ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-content-muted" />
                            <span>{vol.contact}</span>
                          </span>
                        ) : (
                          <span className="italic text-content-muted">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-content-secondary whitespace-nowrap">
                        {formatDate(vol.createdAt)}
                      </td>
                      {canManage && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              icon={<Edit2 className="w-3.5 h-3.5" />}
                              onClick={() => setEditingVolunteer(vol)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-danger hover:bg-danger-subtle"
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              onClick={() => setRemovingVolunteer(vol)}
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Card View (320px-430px) */}
          <div className="md:hidden space-y-3">
            {filteredVolunteers.map((vol) => (
              <Card key={vol.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-content-primary block">
                      {vol.name}
                    </span>
                    <span className="text-xs text-content-secondary font-mono">
                      {vol.email}
                    </span>
                  </div>
                  <Badge variant="info" size="sm">
                    {vol.responsibility}
                  </Badge>
                </div>

                {vol.contact && (
                  <div className="text-xs text-content-secondary flex items-center gap-1.5 pt-1 border-t border-border">
                    <Phone className="w-3.5 h-3.5 text-content-muted" />
                    <span>{vol.contact}</span>
                  </div>
                )}

                {canManage && (
                  <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs h-7 px-2.5"
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => setEditingVolunteer(vol)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2.5 text-danger hover:bg-danger-subtle"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => setRemovingVolunteer(vol)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add Volunteer Modal */}
      <AddVolunteerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        eventId={eventId}
        clubId={clubId}
        currentVolunteers={volunteers}
        onSuccess={() => {
          fetchVolunteers();
        }}
      />

      {/* Edit Volunteer Modal */}
      <EditVolunteerModal
        isOpen={Boolean(editingVolunteer)}
        onClose={() => setEditingVolunteer(null)}
        eventId={eventId}
        volunteer={editingVolunteer}
        onSuccess={() => {
          fetchVolunteers();
        }}
      />

      {/* Remove Volunteer Modal */}
      <RemoveVolunteerModal
        isOpen={Boolean(removingVolunteer)}
        onClose={() => setRemovingVolunteer(null)}
        eventId={eventId}
        volunteer={removingVolunteer}
        onSuccess={() => {
          fetchVolunteers();
        }}
      />
    </div>
  );
};

export default EventVolunteersTab;
