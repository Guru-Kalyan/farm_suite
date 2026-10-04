import React, { useState, useEffect } from 'react';
import { Drawer } from '../common/Drawer';
import { auditApi } from '../../api/audit';
import { formatDateTime } from '../../utils/formatters';

export const AuditTimeline = ({ isOpen, onClose, model, objectId }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && model && objectId) {
      setLoading(true);
      auditApi.getEntityTimeline(model, objectId)
        .then(res => {
          if (res && res.data) {
            setTimeline(res.data.timeline || []);
          }
        })
        .catch(err => console.error("Error fetching audit timeline:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, model, objectId]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Audit Trail: ${model} #${objectId}`}
      width="450px"
    >
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading audit trail...
        </div>
      ) : timeline.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No recorded audit history for this item.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
          {/* Vertical connecting line */}
          <div style={{
            position: 'absolute',
            top: '12px',
            bottom: '12px',
            left: '11px',
            width: '2px',
            backgroundColor: 'var(--border-subtle)',
            zIndex: 0
          }} />

          {timeline.map((entry, idx) => (
            <div key={entry.id || idx} style={{ display: 'flex', gap: '14px', position: 'relative', zIndex: 1 }}>
              {/* Dot */}
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface)',
                border: '2px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                •
              </div>

              {/* Card */}
              <div style={{
                flex: 1,
                backgroundColor: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                fontSize: '12.5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                    {entry.action} by {entry.user}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {formatDateTime(entry.timestamp)}
                  </span>
                </div>

                <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {entry.description}
                </div>

                {entry.changed_fields && entry.changed_fields.length > 0 && (
                  <div style={{
                    marginTop: '6px',
                    padding: '8px',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11.5px'
                  }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Field Diffs:
                    </div>
                    {entry.changed_fields.map((field, fIdx) => (
                      <div key={fIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{field}:</span>
                        <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>
                          {String(entry.old_values[field] ?? 'None')}
                        </span>
                        <span>→</span>
                        <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                          {String(entry.new_values[field] ?? 'None')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
};
