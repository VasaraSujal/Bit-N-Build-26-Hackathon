import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  CheckSquare,
  Users,
  AlertTriangle,
  FileText,
  Search,
  Sparkles,
  Megaphone,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';

/**
 * Role-Based Navigation Configuration
 */
const getNavigationForRole = (role) => {
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isClubAdmin = role === 'CLUB_ADMIN';
  const isVolunteer = role === 'VOLUNTEER';

  // 1. Overview Section
  const overviewSection = {
    group: null,
    items: [
      { name: 'Overview', to: '/app/dashboard', icon: LayoutDashboard, end: true }
    ]
  };

  // 2. Operations Section
  const operationsItems = [];
  if (isSuperAdmin) {
    operationsItems.push({ name: 'Clubs', to: '/app/clubs', icon: Building2 });
  }
  operationsItems.push({ name: 'Events', to: '/app/events', icon: Calendar });
  operationsItems.push({
    name: isVolunteer ? 'My Tasks' : 'Tasks',
    to: '/app/tasks',
    icon: CheckSquare
  });
  if (isSuperAdmin || isClubAdmin) {
    operationsItems.push({ name: 'Volunteers', to: '/app/volunteers', icon: Users });
    operationsItems.push({ name: 'Risks', to: '/app/risks', icon: AlertTriangle });
  }

  const operationsSection = {
    group: 'Operations',
    items: operationsItems
  };

  // 3. Knowledge Section (accessible to all authenticated roles)
  const knowledgeSection = {
    group: 'Knowledge',
    items: [
      { name: 'Documents', to: '/app/documents', icon: FileText },
      { name: 'Knowledge Q&A', to: '/app/knowledge', icon: Search }
    ]
  };

  // 4. AI Tools Section
  const aiItems = [];
  if (isSuperAdmin || isClubAdmin) {
    aiItems.push({ name: 'Meeting Tasks', to: '/app/meeting-tasks', icon: Sparkles });
  }
  aiItems.push({ name: 'Announcements', to: '/app/announcements', icon: Megaphone });

  const aiSection = {
    group: 'AI Tools',
    items: aiItems
  };

  return [overviewSection, operationsSection, knowledgeSection, aiSection];
};

const formatRoleBadge = (role) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'CLUB_ADMIN':
      return 'Club Admin';
    case 'VOLUNTEER':
      return 'Volunteer';
    default:
      return 'User';
  }
};

export const Sidebar = ({ onNavigate, className = '' }) => {
  const { user } = useAuth();
  const navigationSections = getNavigationForRole(user?.role);
  const roleLabel = formatRoleBadge(user?.role);

  return (
    <aside className={`w-64 bg-surface border-r border-border flex flex-col h-full select-none ${className}`}>
      {/* Brand Header */}
      <div className="h-14 px-5 border-b border-border flex items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-primary text-white flex items-center justify-center font-bold text-sm shadow-subtle shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-content-primary tracking-tight truncate">
              ClubOps AI
            </span>
            <span className="text-[11px] text-content-muted font-medium truncate">
              Event Operations
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Main Navigation">
        {navigationSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.group && (
              <div className="px-2.5 pb-1.5 text-[11px] font-semibold text-content-muted uppercase tracking-wider">
                {section.group}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary-subtle text-primary font-semibold'
                            : 'text-content-secondary hover:text-content-primary hover:bg-surface-muted'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.name}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Role & Status Info */}
      <div className="p-3 border-t border-border shrink-0 bg-surface-muted/40 space-y-2">
        <div className="px-2.5 py-2 rounded-lg bg-white border border-border flex items-center justify-between text-xs">
          <span className="text-content-secondary font-medium truncate flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="truncate">{roleLabel}</span>
          </span>
          <span className="w-2 h-2 rounded-full bg-success shrink-0" title="Connected to Supabase" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
