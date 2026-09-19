import React, { useState, useRef, useEffect } from 'react';
import { Menu, User, LogOut, ChevronDown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

const ROUTE_TITLES = {
  '/app': 'Dashboard',
  '/app/dashboard': 'Dashboard',
  '/app/clubs': 'Club Management',
  '/app/events': 'Events',
  '/app/tasks': 'Tasks',
  '/app/volunteers': 'Volunteers',
  '/app/risks': 'Risk Detection',
  '/app/documents': 'Document Repository',
  '/app/knowledge': 'Knowledge Q&A',
  '/app/meeting-tasks': 'AI Meeting Tasks',
  '/app/announcements': 'Announcements',
  '/403': 'Access Restricted'
};

const formatRoleLabel = (role) => {
  if (!role) return 'Administrator';
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'CLUB_ADMIN':
      return 'Club Admin';
    case 'VOLUNTEER':
      return 'Volunteer';
    default:
      return role;
  }
};

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'CO';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Topbar = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const displayName = user?.name || 'Sujal Vasara';
  const displayRole = formatRoleLabel(user?.role);
  const initials = getInitials(displayName);

  const currentTitle = ROUTE_TITLES[location.pathname] || 'Dashboard';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-surface border-b border-border px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-10 select-none">
      {/* Left: Mobile hamburger + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open mobile menu"
          className="lg:hidden p-1.5 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-content-primary tracking-tight truncate">
            {currentTitle}
          </h1>
        </div>
      </div>

      {/* Right: User area & dropdown */}
      <div className="relative shrink-0" ref={userMenuRef}>
        <button
          type="button"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          aria-expanded={userMenuOpen}
          aria-haspopup="true"
          className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary text-left"
        >
          <div className="w-7 h-7 rounded-full bg-surface-muted border border-border flex items-center justify-center text-content-secondary text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col min-w-0 pr-1">
            <span className="text-xs font-semibold text-content-primary truncate leading-tight">
              {displayName}
            </span>
            <span className="text-[11px] text-content-muted truncate leading-tight">
              {displayRole}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-content-muted shrink-0 hidden sm:block" />
        </button>

        {/* User Dropdown Menu */}
        {userMenuOpen && (
          <div
            className="absolute right-0 mt-1.5 w-48 bg-surface border border-border rounded-panel shadow-modal py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="px-3 py-2 border-b border-border sm:hidden">
              <p className="text-xs font-semibold text-content-primary truncate">{displayName}</p>
              <p className="text-[11px] text-content-muted truncate">{displayRole}</p>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => setUserMenuOpen(false)}
              className="w-full px-3 py-2 text-xs text-content-primary hover:bg-surface-muted flex items-center gap-2 text-left transition-colors"
            >
              <User className="w-3.5 h-3.5 text-content-muted" />
              <span>Profile</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full px-3 py-2 text-xs text-danger hover:bg-danger-subtle flex items-center gap-2 text-left transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-danger" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
