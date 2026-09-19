import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileDrawer } from './MobileDrawer';

export const AppShell = ({ children }) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-page overflow-hidden">
      {/* Desktop Sidebar (visible on lg: 1024px+) */}
      <div className="hidden lg:flex shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile Drawer (visible when open on mobile/tablet) */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Main Column */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Topbar */}
        <Topbar onMenuClick={() => setMobileDrawerOpen(true)} />

        {/* Scrollable Main Content Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 min-w-0">
          <div className="max-w-7xl mx-auto w-full min-w-0">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
