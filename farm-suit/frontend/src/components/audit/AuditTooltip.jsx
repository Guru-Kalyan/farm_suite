import React, { useState } from 'react';
import { auditApi } from '../../api/audit';
import { formatDateTime } from '../../utils/formatters';

export const AuditTooltip = ({ model, id, onOpenTimeline }) => {
  const [hovered, setHovered] = useState(false);
  const [latestInfo, setLatestInfo] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const handleMouseEnter = async () => {
    setHovered(true);
    if (!loaded) {
      try {
        const res = await auditApi.getEntityTimeline(model, id);
        if (res && res.data && res.data.latest) {
          setLatestInfo(res.data.latest);
        }
        setLoaded(true);
      } catch (_) {}
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => onOpenTimeline && onOpenTimeline(model, id)}
        title="View change history"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 4px',
          fontSize: '13px',
          color: 'var(--text-muted)',
          display: 'inline-flex',
          alignItems: 'center',
          transition: 'color var(--transition-fast)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        🕘
      </button>

      {hovered && latestInfo && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '6px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          padding: '10px 12px',
          zIndex: 1050,
          width: '220px',
          fontSize: '11.5px',
          color: 'var(--text-primary)',
          pointerEvents: 'none',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          <div style={{ fontWeight: '700', color: 'var(--primary-text)', marginBottom: '2px' }}>
            Changed by {latestInfo.user}
          </div>
          <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>
            {formatDateTime(latestInfo.timestamp)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {latestInfo.description || `${latestInfo.action} action`}
          </div>
          <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--primary)', fontWeight: '600' }}>
            Click to view full history →
          </div>
        </div>
      )}
    </div>
  );
};
