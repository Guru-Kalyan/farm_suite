import React from 'react';

export const SourceBadge = ({ source = 'PURCHASE' }) => {
  const isHarvest = (source || '').toUpperCase() === 'HARVEST';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontSize: '11px',
      fontWeight: '600',
      backgroundColor: isHarvest ? 'var(--primary-subtle)' : 'var(--info-subtle)',
      color: isHarvest ? 'var(--primary-text)' : 'var(--info-text)',
      border: `1px solid ${isHarvest ? 'var(--primary-border)' : 'var(--info)'}`,
      whiteSpace: 'nowrap'
    }}>
      <span>{isHarvest ? '🌾' : '📦'}</span>
      {isHarvest ? 'Farm Produced' : 'Purchased'}
    </span>
  );
};
