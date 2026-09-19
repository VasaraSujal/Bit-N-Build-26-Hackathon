import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { LoadingState } from '../ui/LoadingState';

/**
 * RoleRoute Wrapper
 * Enforces role-based permissions on a protected route.
 * 
 * @param {object} props
 * @param {Array<string>} props.allowedRoles - e.g. ['SUPER_ADMIN', 'CLUB_ADMIN']
 * @param {React.ReactNode} props.children
 */
export const RoleRoute = ({ allowedRoles = [], children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <LoadingState message="Verifying permissions..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/403" replace />;
  }

  return children;
};

export default RoleRoute;
