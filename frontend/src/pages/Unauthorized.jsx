import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/useAuth';

export const Unauthorized = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center border-danger-border shadow-modal">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger-subtle border border-danger-border flex items-center justify-center text-danger mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-content-primary">
              403 — Access Restricted
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary max-w-sm mx-auto">
              Your account does not have sufficient role permissions to view or perform operations in this section.
            </p>
          </div>

          <div className="p-3 bg-surface-muted border border-border rounded-lg flex items-center justify-between text-xs">
            <span className="text-content-secondary">Authenticated Role:</span>
            <Badge variant="danger" size="sm">
              {user?.role || 'UNASSIGNED'}
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Link to="/app/dashboard" className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
                Return to Dashboard
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className="w-full sm:w-auto"
              icon={<LogOut className="w-3.5 h-3.5 text-content-secondary" />}
            >
              Sign in as Different Role
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
