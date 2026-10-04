import React from 'react';

export const KpiCard = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default', // 'default' | 'primary' | 'accent' | 'success'
  onClick
}) => {
  let borderColor = 'var(--border-subtle)';
  let iconBg = 'var(--bg-surface-secondary)';

  if (variant === 'primary') {
    iconBg = 'var(--primary-subtle)';
  } else if (variant === 'accent') {
    iconBg = 'var(--accent-subtle)';
  } else if (variant === 'success') {
    iconBg = 'var(--success-subtle)';
  }

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
        position: 'relative',
        overflow: 'hidden'
      }}
      className="kpi-card"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', marginTop: '4px' }}>
            {value}
          </div>
        </div>
        {icon && (
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            {icon}
          </div>
        )}
      </div>

      {subtitle && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
