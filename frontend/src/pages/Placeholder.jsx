import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Info, Sparkles, ExternalLink } from 'lucide-react';

export const Placeholder = ({ title, description, moduleName, deliverableInfo }) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
              {title}
            </h2>
            <Badge variant="neutral" size="sm">
              Phase 1 Shell
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-content-secondary">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModalOpen(true)}
            icon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            Inspect UI Modal
          </Button>
        </div>
      </div>

      {/* Structured Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{moduleName || title} Module Foundation</CardTitle>
            <Badge variant="info" size="sm">
              Part 1: Foundation
            </Badge>
          </div>
          <CardDescription>
            {deliverableInfo || `${title} management and business workflows will be connected to the backend API in the upcoming implementation phase.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-surface-muted border border-border flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-content-secondary space-y-1">
              <p className="font-medium text-content-primary">
                Production Application Shell Established
              </p>
              <p>
                The backend service for this module is fully complete in <code className="px-1.5 py-0.5 bg-white border border-border rounded text-[11px] font-mono text-content-primary">server/</code>. Frontend views will be wired to backend REST endpoints in subsequent parts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-white border border-border rounded-lg">
              <span className="text-[11px] text-content-muted block mb-1">UI System Status</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="success" size="sm">Operational</Badge>
              </div>
            </div>

            <div className="p-3 bg-white border border-border rounded-lg">
              <span className="text-[11px] text-content-muted block mb-1">Responsive Shell</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="info" size="sm">320px – 1920px</Badge>
              </div>
            </div>

            <div className="p-3 bg-white border border-border rounded-lg">
              <span className="text-[11px] text-content-muted block mb-1">Design Tokens</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="neutral" size="sm">Light SaaS Palette</Badge>
              </div>
            </div>

            <div className="p-3 bg-white border border-border rounded-lg">
              <span className="text-[11px] text-content-muted block mb-1">API Client</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="success" size="sm">Fetch Native</Badge>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <span className="text-xs text-content-muted">
            ClubOps AI — Module Shell
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            View Specs
          </Button>
        </CardFooter>
      </Card>

      {/* Modal Verification Component */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${title} Specifications`}
        description="Verify responsive modal behavior, keyboard handling (Escape), and typography."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
              Got it
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs sm:text-sm text-content-secondary">
          <p>
            This modal verifies that the layout stays inside the viewport bounds on all screen sizes (from 320px mobile to 1920px desktop) with internal scrolling and accessible focus management.
          </p>
          <Input
            label="Example Input inside Modal"
            placeholder="Type something to test focus..."
            helperText="Input components support keyboard navigation and focus rings."
          />
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="success">Active</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="danger">Blocked</Badge>
            <Badge variant="info">AI Suggested</Badge>
            <Badge variant="neutral">Draft</Badge>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Placeholder;
