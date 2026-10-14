import React from 'react';

export const StatusBadge = ({ status = 'DRAFT' }) => {
  const norm = (status || '').toUpperCase();

  const configMap = {
    // Bill / Record Statuses
    DRAFT: { label: 'Draft', bg: 'rgba(148, 163, 184, 0.15)', text: 'var(--text-secondary)', border: 'var(--border-subtle)' },
    POSTED: { label: 'Posted', bg: 'var(--success-subtle)', text: 'var(--success-text)', border: 'var(--success)' },
    CANCELLED: { label: 'Cancelled', bg: 'var(--danger-subtle)', text: 'var(--danger-text)', border: 'var(--danger)' },
    REVERSED: { label: 'Reversed', bg: 'var(--danger-subtle)', text: 'var(--danger-text)', border: 'var(--danger)' },
    COMPLETED: { label: 'Completed', bg: 'var(--success-subtle)', text: 'var(--success-text)', border: 'var(--success)' },

    // Payment Statuses
    PAID: { label: 'Paid', bg: 'rgba(34, 197, 94, 0.15)', text: '#15803d', border: '#86efac' },
    PARTIALLY_PAID: { label: 'Partially Paid', bg: 'rgba(245, 158, 11, 0.15)', text: '#b45309', border: '#fcd34d' },
    UNPAID: { label: 'Unpaid', bg: 'rgba(239, 68, 68, 0.15)', text: '#b91c1c', border: '#fca5a5' },

    // Order Lifecycle Statuses
    PENDING: { label: 'Pending', bg: 'rgba(234, 179, 8, 0.15)', text: '#a16207', border: '#fde047' },
    CONFIRMED: { label: 'Confirmed', bg: 'rgba(59, 130, 246, 0.15)', text: '#1d4ed8', border: '#93c5fd' },
    IN_PREPARATION: { label: 'In Preparation', bg: 'rgba(168, 85, 247, 0.15)', text: '#7e22ce', border: '#d8b4fe' },
    READY: { label: 'Ready for Dispatch', bg: 'rgba(20, 184, 166, 0.15)', text: '#0f766e', border: '#5eead4' },
    DISPATCHED: { label: 'Dispatched', bg: 'rgba(99, 102, 241, 0.15)', text: '#4338ca', border: '#a5b4fc' },
    DELIVERED: { label: 'Delivered', bg: 'rgba(34, 197, 94, 0.15)', text: '#15803d', border: '#86efac' },

    // Order & Sale Types
    REGULAR: { label: 'Regular', bg: 'rgba(100, 116, 139, 0.15)', text: '#475569', border: '#cbd5e1' },
    TRADE: { label: 'Trade', bg: 'rgba(14, 165, 233, 0.15)', text: '#0369a1', border: '#7dd3fc' },
    ADVANCE: { label: 'Advance Order', bg: 'rgba(168, 85, 247, 0.15)', text: '#7e22ce', border: '#d8b4fe' },

    // Farming & Inventory
    PLANNED: { label: 'Planned', bg: 'var(--info-subtle)', text: 'var(--info-text)', border: 'var(--info)' },
    ACTIVE: { label: 'Active', bg: 'var(--primary-subtle)', text: 'var(--primary-text)', border: 'var(--primary)' },
    HARVESTED: { label: 'Harvested', bg: 'rgba(168, 85, 247, 0.15)', text: '#7e22ce', border: '#c084fc' },
    AVAILABLE: { label: 'Available', bg: 'var(--success-subtle)', text: 'var(--success-text)', border: 'var(--success)' },
    DEPLETED: { label: 'Depleted', bg: 'rgba(100, 116, 139, 0.12)', text: 'var(--text-muted)', border: 'var(--border-subtle)' },
  };

  const current = configMap[norm] || { label: norm, bg: 'var(--bg-surface-secondary)', text: 'var(--text-secondary)', border: 'var(--border-subtle)' };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 9px',
      borderRadius: 'var(--radius-full)',
      fontSize: '11.5px',
      fontWeight: '600',
      backgroundColor: current.bg,
      color: current.text,
      border: `1px solid ${current.border}`,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap'
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: current.text,
        marginRight: '6px',
        opacity: 0.8
      }} />
      {current.label}
    </span>
  );
};
