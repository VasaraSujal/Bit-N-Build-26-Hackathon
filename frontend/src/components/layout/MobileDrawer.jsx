import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';

export const MobileDrawer = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-72 max-w-[85vw] bg-surface h-full flex flex-col z-10 shadow-modal animate-in slide-in-from-left duration-200">
        {/* Mobile close trigger inside header area */}
        <div className="absolute top-3.5 right-3 z-20">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar content */}
        <Sidebar onNavigate={onClose} className="w-full border-r-0" />
      </div>
    </div>
  );
};

export default MobileDrawer;
