import React from 'react';

export const DataTable = ({
  columns = [], // [{ key, header, render, align, width }]
  data = [],
  loading = false,
  emptyMessage = 'No records found',
  onRowClick,
  className = ''
}) => {
  if (loading) {
    return (
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              height: '36px',
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-sm)',
              animation: 'pulse 1.2s ease-in-out infinite'
            }}
          />
        ))}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--text-muted)'
      }}>
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🍃</div>
        <div style={{ fontSize: '14px', fontWeight: '500' }}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-sm)',
      overflowX: 'auto',
      width: '100%'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
        fontSize: '13px'
      }}>
        <thead>
          <tr style={{
            backgroundColor: 'var(--bg-surface-secondary)',
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                style={{
                  padding: '12px 16px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  textAlign: col.align || 'left',
                  width: col.width || 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              style={{
                borderBottom: rowIdx === data.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                if (onRowClick) e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
              }}
              onMouseLeave={(e) => {
                if (onRowClick) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={col.key || colIdx}
                  style={{
                    padding: '12px 16px',
                    color: 'var(--text-primary)',
                    textAlign: col.align || 'left',
                    verticalAlign: 'middle'
                  }}
                >
                  {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
