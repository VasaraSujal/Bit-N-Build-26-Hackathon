import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/useAuth';

export const NotFound = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center border-border shadow-card">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary-subtle border border-blue-200 flex items-center justify-center text-primary mx-auto">
            <Compass className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-content-primary">
              404 — Page Not Found
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary max-w-sm mx-auto">
              The page you are looking for does not exist, has been removed, or the link may be outdated.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Link to={isAuthenticated ? '/app/dashboard' : '/'} className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                icon={<Home className="w-3.5 h-3.5" />}
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Back to Home'}
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto"
              icon={<ArrowLeft className="w-3.5 h-3.5 text-content-secondary" />}
            >
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
