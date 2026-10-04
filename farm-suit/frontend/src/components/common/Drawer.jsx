import React, { useEffect } from 'react';

export const Drawer = ({
  isOpen,
  onClose,
  title,
  children,
  width = '420px',
  position = 'right' // 'right' | 'left'
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1100,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      justifyContent: position === 'right' ? 'flex-end' : 'flex-start',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: width,
          height: '100%',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-xl)',
          borderLeft: position === 'right' ? '1px solid var(--border-subtle)' : 'none',
          borderRight: position === 'left' ? '1px solid var(--border-subtle)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          animation: position === 'right' ? 'slideInRight 0.25s ease-out' : 'slideInLeft 0.25s ease-out'
        }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface-secondary)'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
