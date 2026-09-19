import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const Home = () => {
  return (
    <div className="min-h-screen bg-page flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="h-16 border-b border-border bg-surface px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-base shadow-subtle">
            <Layers className="w-5 h-5" />
          </div>
          <span className="text-base font-bold text-content-primary tracking-tight">
            ClubOps AI
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/app">
            <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
              Open Workspace
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="max-w-2xl w-full text-center space-y-6">
          <div className="inline-flex items-center gap-2">
            <Badge variant="info" size="md" icon={<Sparkles className="w-3.5 h-3.5" />}>
              Next-Gen Club Operations
            </Badge>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-content-primary tracking-tight leading-tight">
            Event operations, organized.
          </h1>

          <p className="text-base sm:text-lg text-content-secondary max-w-xl mx-auto leading-relaxed">
            Centralize tasks, volunteer assignments, risk detection, documents, and AI-assisted workflows for college club events.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/app" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto" icon={<ArrowRight className="w-4 h-4" />}>
                Open Workspace
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Core Highlights */}
          <div className="pt-8 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-4 bg-surface border border-border rounded-panel">
              <div className="w-7 h-7 rounded-md bg-surface-muted flex items-center justify-center text-primary mb-2.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-content-primary mb-1">Centralized Tracking</h4>
              <p className="text-xs text-content-secondary">
                Unified task board, volunteer roster, and event timelines in one dashboard.
              </p>
            </div>

            <div className="p-4 bg-surface border border-border rounded-panel">
              <div className="w-7 h-7 rounded-md bg-surface-muted flex items-center justify-center text-warning mb-2.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-content-primary mb-1">Deterministic Risks</h4>
              <p className="text-xs text-content-secondary">
                Automated rule-based detection for overdue tasks, blocked owners, and volunteer shortages.
              </p>
            </div>

            <div className="p-4 bg-surface border border-border rounded-panel">
              <div className="w-7 h-7 rounded-md bg-surface-muted flex items-center justify-center text-primary mb-2.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-content-primary mb-1">AI Action Engine</h4>
              <p className="text-xs text-content-secondary">
                Extract tasks from meeting notes and dispatch announcements with human confirmation.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-border bg-surface px-4 text-center text-xs text-content-muted">
        ClubOps AI — Production Event Operations Platform
      </footer>
    </div>
  );
};

export default Home;
