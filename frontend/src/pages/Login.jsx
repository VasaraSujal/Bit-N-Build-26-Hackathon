import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Layers, ArrowLeft, AlertCircle, ArrowRight, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { demoAccounts, isDemoConfigured } from '../config/demoAccounts';
import { useAuth } from '../context/useAuth';
import { ApiError } from '../lib/api';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [loadingRole, setLoadingRole] = useState(null); // 'SUPER_ADMIN' | 'CLUB_ADMIN' | 'VOLUNTEER' | 'MANUAL' | null
  const [errorMessage, setErrorMessage] = useState(null);
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [manualPassword, setManualPassword] = useState('');

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const target = location.state?.from?.pathname || '/app/dashboard';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location]);

  /**
   * Core sign-in handler
   */
  const handleSignIn = async (email, password, roleKey = 'MANUAL') => {
    setErrorMessage(null);
    setLoadingRole(roleKey);

    try {
      if (!email || !email.trim() || !password) {
        throw new Error('Please provide both email and password.');
      }

      await login({ email: email.trim(), password });

      const target = location.state?.from?.pathname || '/app/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorMessage('Unable to sign in with these credentials. Please check the configured demo account.');
        } else if (err.status === 0) {
          setErrorMessage('Unable to connect to the ClubOps server. Please make sure the backend is running.');
        } else {
          setErrorMessage(err.message || 'Authentication failed. Please try again.');
        }
      } else {
        setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
      }
    } finally {
      setLoadingRole(null);
    }
  };

  /**
   * Role-based button click handler
   */
  const handleRoleSelect = (roleKey) => {
    const account = demoAccounts[roleKey];
    if (!account || !isDemoConfigured(roleKey)) {
      setErrorMessage(`Demo account for ${account?.label || roleKey} is not configured in environment variables.`);
      return;
    }

    handleSignIn(account.email, account.password, roleKey);
  };

  /**
   * Manual login form submission handler
   */
  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleSignIn(manualEmail, manualPassword, 'MANUAL');
  };

  const isAnyLoading = Boolean(loadingRole) || authLoading;

  return (
    <div className="min-h-screen bg-page flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header & Back Navigation */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-content-secondary hover:text-content-primary transition-colors py-1 focus:outline-none focus:ring-2 focus:ring-primary rounded"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <Badge variant="neutral" size="sm">
          Demo Environment
        </Badge>
      </header>

      {/* Main Login Container */}
      <main className="max-w-xl w-full mx-auto my-6 sm:my-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-base shadow-subtle shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-content-primary tracking-tight">
              ClubOps AI
            </span>
          </div>
          <p className="text-xs sm:text-sm text-content-secondary">
            Event operations, organized.
          </p>
        </div>

        {/* Login Box */}
        <Card className="shadow-modal">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-lg sm:text-xl">Sign in to workspace</CardTitle>
            <CardDescription>
              Choose a demo role to continue to the operations console
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {/* Error Notification */}
            {errorMessage && (
              <div
                className="p-3.5 bg-danger-subtle border border-danger-border rounded-lg flex items-start gap-2.5 text-xs sm:text-sm text-danger animate-in fade-in duration-150"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* 3 Role Selection Cards */}
            <div className="space-y-3" role="group" aria-label="Demo Role Options">
              {Object.entries(demoAccounts).map(([roleKey, account]) => {
                const Icon = account.icon;
                const isLoadingThis = loadingRole === roleKey;
                const isConfigured = isDemoConfigured(roleKey);

                return (
                  <div
                    key={roleKey}
                    className="p-4 bg-surface rounded-panel border border-border hover:border-border-dark transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-subtle"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-content-primary">
                            {account.label}
                          </span>
                          <Badge variant="neutral" size="sm">
                            {account.badge}
                          </Badge>
                        </div>
                        <p className="text-xs text-content-secondary line-clamp-2">
                          {account.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pt-1 sm:pt-0">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isAnyLoading || !isConfigured}
                        isLoading={isLoadingThis}
                        onClick={() => handleRoleSelect(roleKey)}
                        className="w-full sm:w-auto"
                        icon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        {isLoadingThis
                          ? `Signing in as ${account.label}...`
                          : account.buttonText}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Secondary Manual Login Collapsible */}
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowManualLogin(!showManualLogin)}
                className="w-full py-2 flex items-center justify-between text-xs text-content-secondary hover:text-content-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
                aria-expanded={showManualLogin}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Or sign in with custom credentials</span>
                </span>
                {showManualLogin ? (
                  <ChevronUp className="w-3.5 h-3.5 text-content-muted" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-content-muted" />
                )}
              </button>

              {showManualLogin && (
                <form
                  onSubmit={handleManualSubmit}
                  className="space-y-3 pt-3 mt-1 animate-in fade-in duration-150"
                >
                  <Input
                    label="Email address"
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={manualEmail}
                    disabled={isAnyLoading}
                    onChange={(e) => setManualEmail(e.target.value)}
                  />

                  <Input
                    label="Password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={manualPassword}
                    disabled={isAnyLoading}
                    onChange={(e) => setManualPassword(e.target.value)}
                  />

                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={isAnyLoading}
                    isLoading={loadingRole === 'MANUAL'}
                  >
                    Sign In with Credentials
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-xl w-full mx-auto text-center text-xs text-content-muted">
        ClubOps AI — Production Event Operations Platform
      </footer>
    </div>
  );
};

export default Login;
