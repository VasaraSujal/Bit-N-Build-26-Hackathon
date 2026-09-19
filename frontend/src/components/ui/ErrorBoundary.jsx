import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button } from './Button';

/**
 * Production-ready Global Error Boundary
 * Prevents full-application white-screens on uncaught render exceptions.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Controlled production error capture without exposing sensitive data
    if (import.meta.env.DEV) {
      console.error('[ClubOps UI Error Boundary caught an exception]:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoDashboard = () => {
    window.location.href = '/app/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-page">
          <div className="w-full max-w-md bg-surface border border-border rounded-panel p-6 sm:p-8 shadow-card text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-danger-subtle border border-danger-border flex items-center justify-center text-danger mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-content-primary">
                Something went wrong
              </h2>
              <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
                The application encountered an unexpected interface issue. Your backend data and session remain secure.
              </p>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Button
                variant="primary"
                size="sm"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={this.handleReload}
                className="w-full sm:w-auto"
              >
                Reload Application
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Home className="w-4 h-4" />}
                onClick={this.handleGoDashboard}
                className="w-full sm:w-auto"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
