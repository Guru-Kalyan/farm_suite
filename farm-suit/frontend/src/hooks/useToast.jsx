import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '380px',
        width: 'calc(100% - 48px)',
        pointerEvents: 'none'
      }}>
        {toasts.map(t => {
          let bg = 'var(--bg-surface)';
          let border = 'var(--border-subtle)';
          let textColor = 'var(--text-primary)';
          let icon = 'ℹ️';

          if (t.type === 'success') {
            bg = 'var(--success-subtle)';
            border = 'var(--success)';
            textColor = 'var(--success-text)';
            icon = '✓';
          } else if (t.type === 'error') {
            bg = 'var(--danger-subtle)';
            border = 'var(--danger)';
            textColor = 'var(--danger-text)';
            icon = '⚠️';
          } else if (t.type === 'warning') {
            bg = 'var(--warning-subtle)';
            border = 'var(--warning)';
            textColor = 'var(--warning-text)';
            icon = '⚡';
          }

          return (
            <div
              key={t.id}
              style={{
                backgroundColor: bg,
                border: `1px solid ${border}`,
                color: textColor,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                pointerEvents: 'auto',
                animation: 'fadeIn 0.2s ease-out',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>{icon}</span>
                <span>{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  opacity: 0.6,
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
