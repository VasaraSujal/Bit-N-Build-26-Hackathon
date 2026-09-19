import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import AppShell from '../components/layout/AppShell';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import RoleRoute from '../components/auth/RoleRoute';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Clubs from '../pages/Clubs';
import ClubDetails from '../pages/ClubDetails';
import Events from '../pages/Events';
import EventDetails from '../pages/EventDetails';
import Tasks from '../pages/Tasks';
import Risks from '../pages/Risks';
import Documents from '../pages/Documents';
import Knowledge from '../pages/Knowledge';
import MeetingTasks from '../pages/MeetingTasks';
import Announcements from '../pages/Announcements';
import Placeholder from '../pages/Placeholder';
import Unauthorized from '../pages/Unauthorized';
import NotFound from '../pages/NotFound';
import { LoadingState } from '../components/ui/LoadingState';

/**
 * Intelligent Root Route Handler
 */
const RootRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <LoadingState message="Checking session..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <Home />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Root Entry */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Login Route */}
      <Route path="/login" element={<Login />} />

      {/* 403 Forbidden Route */}
      <Route
        path="/403"
        element={
          <ProtectedRoute>
            <AppShell>
              <Unauthorized />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Protected Application Shell Workspace */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        {/* Default /app and /app/dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Global Clubs Management (SUPER_ADMIN only) */}
        <Route
          path="clubs"
          element={
            <RoleRoute allowedRoles={['SUPER_ADMIN']}>
              <Clubs />
            </RoleRoute>
          }
        />

        {/* Club Details (SUPER_ADMIN & assigned CLUB_ADMIN) */}
        <Route
          path="clubs/:clubId"
          element={
            <RoleRoute allowedRoles={['SUPER_ADMIN', 'CLUB_ADMIN']}>
              <ClubDetails />
            </RoleRoute>
          }
        />

        {/* Events List (SUPER_ADMIN, CLUB_ADMIN, VOLUNTEER) */}
        <Route path="events" element={<Events />} />

        {/* Event Details (SUPER_ADMIN, CLUB_ADMIN, VOLUNTEER) */}
        <Route path="events/:eventId" element={<EventDetails />} />

        {/* Event Sub-Tab Aliases */}
        <Route path="events/:eventId/tasks" element={<EventDetails initialTab="tasks" />} />
        <Route path="events/:eventId/volunteers" element={<EventDetails initialTab="volunteers" />} />
        <Route path="events/:eventId/risks" element={<EventDetails initialTab="risks" />} />
        <Route path="events/:eventId/documents" element={<EventDetails initialTab="documents" />} />
        <Route path="events/:eventId/knowledge" element={<EventDetails initialTab="knowledge" />} />
        <Route path="events/:eventId/meeting-tasks" element={<EventDetails initialTab="meeting-tasks" />} />
        <Route path="events/:eventId/announcements" element={<EventDetails initialTab="announcements" />} />

        {/* Tasks (SUPER_ADMIN, CLUB_ADMIN, VOLUNTEER) */}
        <Route path="tasks" element={<Tasks />} />

        {/* Volunteers (SUPER_ADMIN, CLUB_ADMIN) */}
        <Route
          path="volunteers"
          element={
            <RoleRoute allowedRoles={['SUPER_ADMIN', 'CLUB_ADMIN']}>
              <Placeholder
                title="Volunteers"
                moduleName="Volunteer Roster"
                description="Organize committee members, roles, responsibilities, and contacts."
                deliverableInfo="Volunteer roster management will be connected to the backend API in the upcoming implementation phase."
              />
            </RoleRoute>
          }
        />

        {/* Risks (SUPER_ADMIN, CLUB_ADMIN) */}
        <Route
          path="risks"
          element={
            <RoleRoute allowedRoles={['SUPER_ADMIN', 'CLUB_ADMIN']}>
              <Risks />
            </RoleRoute>
          }
        />

        {/* Document Repository (All authenticated roles) */}
        <Route path="documents" element={<Documents />} />

        {/* Knowledge Q&A / RAG (All authenticated roles) */}
        <Route path="knowledge" element={<Knowledge />} />

        {/* AI Meeting Tasks (SUPER_ADMIN, CLUB_ADMIN) */}
        <Route
          path="meeting-tasks"
          element={
            <RoleRoute allowedRoles={['SUPER_ADMIN', 'CLUB_ADMIN']}>
              <MeetingTasks />
            </RoleRoute>
          }
        />

        {/* Announcements (SUPER_ADMIN, CLUB_ADMIN, VOLUNTEER) */}
        <Route path="announcements" element={<Announcements />} />

        {/* Discord Setup (SUPER_ADMIN, CLUB_ADMIN) */}
        <Route
          path="discord"
          element={
            <RoleRoute allowedRoles={['SUPER_ADMIN', 'CLUB_ADMIN']}>
              <Placeholder
                title="Discord Integration"
                moduleName="Discord Webhook Configuration"
                description="Connect channels and test alert dispatch."
                deliverableInfo="Discord webhook configuration is securely managed in server environment settings."
              />
            </RoleRoute>
          }
        />

        {/* Analytics (SUPER_ADMIN, CLUB_ADMIN) */}
        <Route
          path="analytics"
          element={
            <RoleRoute allowedRoles={['SUPER_ADMIN', 'CLUB_ADMIN']}>
              <Placeholder
                title="Operational Analytics"
                moduleName="Operational Intelligence"
                description="Volunteer load distribution, task completion velocity, and risk trends."
                deliverableInfo="Analytics dashboards will be connected in Part 9."
              />
            </RoleRoute>
          }
        />
        {/* Catch-all 404 inside /app */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Fallback Catch-All Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
