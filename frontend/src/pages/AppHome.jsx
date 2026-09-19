import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckSquare,
  Users,
  AlertTriangle,
  FileText,
  Sparkles,
  Megaphone,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { getUser } from '../lib/auth';

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

export const AppHome = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const currentUser = getUser();
  const displayName = currentUser?.name || 'Sujal Vasara';
  const roleLabel = formatRoleLabel(currentUser?.role);

  const modules = [
    {
      title: 'Events',
      to: '/app/events',
      icon: Calendar,
      description: 'Create and organize club events, schedules, and active status tracking.',
      badge: 'Core Operations'
    },
    {
      title: 'Tasks',
      to: '/app/tasks',
      icon: CheckSquare,
      description: 'Assign action items, manage deadlines, and track completion states.',
      badge: 'Task Board'
    },
    {
      title: 'Volunteers',
      to: '/app/volunteers',
      icon: Users,
      description: 'Roster management, role assignments, and member contact directory.',
      badge: 'Roster'
    },
    {
      title: 'Risks',
      to: '/app/risks',
      icon: AlertTriangle,
      description: 'Deterministic operational risk alerts with AI mitigation breakdowns.',
      badge: 'Risk Engine'
    },
    {
      title: 'Document Repository & RAG',
      to: '/app/documents',
      icon: FileText,
      description: 'Event-scoped knowledge documents with zero-hallucination Q&A.',
      badge: 'Knowledge'
    },
    {
      title: 'AI Meeting Tasks',
      to: '/app/meeting-tasks',
      icon: Sparkles,
      description: 'Convert unstructured meeting transcripts into structured task cards.',
      badge: 'AI Pipeline'
    },
    {
      title: 'Announcements',
      to: '/app/announcements',
      icon: Megaphone,
      description: 'AI-drafted team announcements with human-confirmed Discord dispatch.',
      badge: 'AI Action'
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome Banner */}
      <div className="p-5 sm:p-6 bg-surface border border-border rounded-panel flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-subtle">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
              Event Operations Workspace
            </h2>
            <Badge variant="success" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
              Supabase Connected
            </Badge>
            <Badge variant="info" size="sm" icon={<UserCheck className="w-3.5 h-3.5" />}>
              {roleLabel} ({displayName})
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-content-secondary max-w-2xl">
            Welcome to the ClubOps AI management console. Seamlessly coordinate club tasks, volunteers, risks, documents, and AI-assisted workflows.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            Design System Modal
          </Button>
          <Link to="/app/events">
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Browse Events
            </Button>
          </Link>
        </div>
      </div>

      {/* Module Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.to} className="flex flex-col justify-between hover:border-border-dark transition-colors">
              <CardHeader className="border-b-0 pb-2">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge variant="neutral" size="sm">
                    {m.badge}
                  </Badge>
                </div>
                <CardTitle className="text-base">{m.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {m.description}
                </CardDescription>
              </CardHeader>

              <CardFooter className="pt-3 border-t-0 bg-transparent">
                <Link to={m.to} className="w-full">
                  <Button variant="secondary" size="sm" className="w-full justify-between" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                    <span>Open {m.title}</span>
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Reusable Component Verification Box */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Production UI Component Palette</CardTitle>
          <CardDescription>
            Interactive verification for design system tokens, button variants, and badges.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm">Primary Button</Button>
            <Button variant="secondary" size="sm">Secondary Button</Button>
            <Button variant="danger" size="sm">Danger Button</Button>
            <Button variant="ghost" size="sm">Ghost Button</Button>
            <Button variant="primary" size="sm" isLoading>Loading State</Button>
            <Button variant="secondary" size="sm" disabled>Disabled</Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <Badge variant="neutral">Neutral Badge</Badge>
            <Badge variant="info">Info Badge</Badge>
            <Badge variant="success">Success Badge</Badge>
            <Badge variant="warning">Warning Badge</Badge>
            <Badge variant="danger">Danger Badge</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Modal Verification */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Production Design System Specs"
        description="Verify typography, colors, responsive inputs, and keyboard accessibility."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs sm:text-sm text-content-secondary">
          <p>
            The layout strictly adheres to the calm, light, operational SaaS visual language with neutral surfaces, selective accent blues, and no horizontal overflow.
          </p>

          <Input
            label="Sample Input"
            placeholder="Type sample text..."
            helperText="Supports validation states, accessibility labels, and focus rings."
          />

          <Select
            label="Sample Dropdown"
            options={[
              { value: 'option1', label: 'Option 1 - Operations' },
              { value: 'option2', label: 'Option 2 - Knowledge Repository' },
              { value: 'option3', label: 'Option 3 - AI Workflows' }
            ]}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AppHome;
