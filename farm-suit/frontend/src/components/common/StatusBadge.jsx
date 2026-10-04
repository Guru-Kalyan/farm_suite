import React from 'react';

export const StatusBadge = ({ status = 'DRAFT' }) => {
  const norm = (status || '').toUpperCase();

  const configMap = {
    DRAFT: { label: 'Draft', bg: 'rgba(148, 163, 184, 0.15)', text: 'var(--text-secondary)', border: 'var(--border-subtle)' },
    POSTED: { label: 'Posted', bg: 'var(--success-subtle)', text: 'var(--success-text)', border: 'var(--success)' },
    CANCELLED: { label: 'Cancelled', bg: 'var(--warning-subtle)', text: 'var(--warning-text)', border: 'var(--warning)' },
    REVERSED: { label: 'Reversed', bg: 'var(--danger-subtle)', text: 'var(--danger-text)', border: 'var(--danger)' },
    PLANNED: { label: 'Planned', bg: 'var(--info-subtle)', text: 'var(--info-text)', border: 'var(--info)' },
    ACTIVE: { label: 'Active', bg: 'var(--primary-subtle)', text: 'var(--primary-text)', border: 'var(--primary)' },
    HARVESTED: { label: 'Harvested', bg: 'rgba(168, 85, 247, 0.15)', text: '#7e22ce', border: '#c084fc' },
    COMPLETED: { label: 'Completed', bg: 'var(--success-subtle)', text: 'var(--success-text)', border: 'var(--success)' },
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
