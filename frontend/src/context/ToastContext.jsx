import React, { useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { ToastContext } from './toastContextInstance';

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ title, message, variant = 'success', duration = 4000 }) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast = { id, title, message, variant };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message, title = 'Success') => {
    showToast({ title, message, variant: 'success' });
  }, [showToast]);

  const error = useCallback((message, title = 'Error') => {
    showToast({ title, message, variant: 'danger' });
  }, [showToast]);

  const info = useCallback((message, title = 'Info') => {
    showToast({ title, message, variant: 'info' });
  }, [showToast]);

  const warning = useCallback((message, title = 'Warning') => {
    showToast({ title, message, variant: 'warning' });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="assertive"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const variantStyles = {
            success: 'bg-white border-success-border text-content-primary',
            danger: 'bg-white border-danger-border text-content-primary',
            warning: 'bg-white border-warning-border text-content-primary',
            info: 'bg-white border-blue-200 text-content-primary'
          };

          const iconMap = {
            success: <CheckCircle2 className="w-4 h-4 text-success shrink-0" />,
            danger: <AlertCircle className="w-4 h-4 text-danger shrink-0" />,
            warning: <AlertTriangle className="w-4 h-4 text-warning shrink-0" />,
            info: <Info className="w-4 h-4 text-primary shrink-0" />
          };

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-3.5 bg-surface border rounded-panel shadow-modal animate-in slide-in-from-bottom-5 duration-200 ${
                variantStyles[toast.variant] || variantStyles.info
              }`}
            >
              <div className="mt-0.5">{iconMap[toast.variant] || iconMap.info}</div>
              <div className="flex-1 min-w-0 pr-1">
                {toast.title && (
                  <p className="text-xs font-semibold text-content-primary leading-tight">
                    {toast.title}
                  </p>
                )}
                <p className="text-xs text-content-secondary mt-0.5 leading-snug">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-content-muted hover:text-content-primary p-1 rounded hover:bg-surface-muted transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
