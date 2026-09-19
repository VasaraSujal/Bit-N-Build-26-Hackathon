import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Power,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../lib/api';
import CreateClubModal from '../components/clubs/CreateClubModal';
import EditClubModal from '../components/clubs/EditClubModal';
import ClubStatusModal from '../components/clubs/ClubStatusModal';

export const Clubs = () => {
  const [clubs, setClubs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [statusTargetClub, setStatusTargetClub] = useState(null);

  const fetchClubs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('clubs');
      setClubs(res.data?.clubs || []);
    } catch (err) {
      setError(err.message || 'Unable to load clubs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const filteredClubs = useMemo(() => {
    if (!searchQuery.trim()) return clubs;
    const q = searchQuery.toLowerCase().trim();
    return clubs.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [clubs, searchQuery]);

  const handleClubCreated = () => {
    fetchClubs();
  };

  const handleClubUpdated = (updated) => {
    setClubs((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
  };

  const handleStatusChanged = (updated) => {
    setClubs((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
  };

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
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
              Club Management
            </h1>
            <Badge variant="info" size="sm">
              SUPER_ADMIN
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-content-secondary">
            Manage organization clubs, view membership rosters, and control active status.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create Club
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 sm:p-4 border border-border rounded-panel shadow-subtle">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-content-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search clubs by name or description..."
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

        <div className="flex items-center gap-2 text-xs text-content-secondary self-end sm:self-center">
          <span>Showing <strong className="text-content-primary">{filteredClubs.length}</strong> {filteredClubs.length === 1 ? 'club' : 'clubs'}</span>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="p-12 bg-surface border border-border rounded-panel flex items-center justify-center">
          <LoadingState message="Loading club records..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to load clubs"
          message={error}
          onRetry={fetchClubs}
        />
      ) : filteredClubs.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-6 h-6 text-content-secondary" />}
          title={searchQuery ? 'No matching clubs' : 'No clubs registered yet'}
          description={
            searchQuery
              ? `No clubs found matching "${searchQuery}". Try a different search term.`
              : 'Get started by creating your first student organization club.'
          }
          action={
            !searchQuery && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateOpen(true)}
              >
                Create Club
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop / Tablet Table View (hidden on small mobile) */}
          <div className="hidden md:block bg-surface border border-border rounded-panel shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60 text-content-secondary font-semibold">
                    <th className="py-3 px-4">Club Name</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredClubs.map((club) => (
                    <tr
                      key={club.id}
                      className="hover:bg-surface-muted/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-content-primary">
                        <div className="flex items-center gap-2.5">
                          {club.logoUrl ? (
                            <img
                              src={club.logoUrl}
                              alt=""
                              className="w-7 h-7 rounded object-cover border border-border shrink-0"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-7 h-7 rounded bg-surface-muted border border-border flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {club.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <Link
                            to={`/app/clubs/${club.id}`}
                            className="hover:text-primary hover:underline font-semibold"
                          >
                            {club.name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-content-secondary max-w-xs truncate">
                        {club.description || <span className="italic text-content-muted">No description</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={club.isActive ? 'success' : 'neutral'}
                          size="sm"
                          icon={
                            club.isActive ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )
                          }
                        >
                          {club.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-content-secondary whitespace-nowrap">
                        {formatDate(club.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to={`/app/clubs/${club.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              icon={<ExternalLink className="w-3.5 h-3.5" />}
                            >
                              Details
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            icon={<Edit2 className="w-3.5 h-3.5" />}
                            onClick={() => setEditingClub(club)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant={club.isActive ? 'ghost' : 'secondary'}
                            size="sm"
                            className={`h-8 px-2 text-xs ${
                              club.isActive ? 'text-danger hover:bg-danger-subtle' : ''
                            }`}
                            icon={<Power className="w-3.5 h-3.5" />}
                            onClick={() => setStatusTargetClub(club)}
                          >
                            {club.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Card Layout (<768px, 320px-430px safe) */}
          <div className="md:hidden space-y-3">
            {filteredClubs.map((club) => (
              <Card key={club.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {club.logoUrl ? (
                      <img
                        src={club.logoUrl}
                        alt=""
                        className="w-8 h-8 rounded object-cover border border-border shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-surface-muted border border-border flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {club.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link
                        to={`/app/clubs/${club.id}`}
                        className="text-sm font-bold text-content-primary hover:text-primary truncate block"
                      >
                        {club.name}
                      </Link>
                      <span className="text-[11px] text-content-muted">
                        Created {formatDate(club.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={club.isActive ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {club.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {club.description && (
                  <p className="text-xs text-content-secondary line-clamp-2">
                    {club.description}
                  </p>
                )}

                <div className="pt-2 border-t border-border flex items-center justify-between gap-1.5 flex-wrap">
                  <Link to={`/app/clubs/${club.id}`} className="flex-1 min-w-[90px]">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs justify-center"
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      Details
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                    onClick={() => setEditingClub(club)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-xs ${
                      club.isActive ? 'text-danger hover:bg-danger-subtle' : ''
                    }`}
                    icon={<Power className="w-3.5 h-3.5" />}
                    onClick={() => setStatusTargetClub(club)}
                  >
                    {club.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create Club Modal */}
      <CreateClubModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleClubCreated}
      />

      {/* Edit Club Modal */}
      <EditClubModal
        isOpen={Boolean(editingClub)}
        onClose={() => setEditingClub(null)}
        club={editingClub}
        onSuccess={handleClubUpdated}
      />

      {/* Activate / Deactivate Modal */}
      <ClubStatusModal
        isOpen={Boolean(statusTargetClub)}
        onClose={() => setStatusTargetClub(null)}
        club={statusTargetClub}
        onSuccess={handleStatusChanged}
      />
    </div>
  );
};

export default Clubs;
