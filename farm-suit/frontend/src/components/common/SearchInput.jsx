import React, { useState, useEffect } from 'react';

export const SearchInput = ({
  value = '',
  onChange,
  placeholder = 'Search...',
  delay = 300,
  style = {}
}) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localVal !== value) {
        onChange(localVal);
      }
    }, delay);
    return () => clearTimeout(handler);
  }, [localVal, delay, onChange, value]);

  return (
    <div style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      width: '260px',
      maxWidth: '100%',
      backgroundColor: 'var(--bg-input)',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      ...style
    }}>
      <span style={{ padding: '0 10px', color: 'var(--text-muted)', fontSize: '14px' }}>
        🔍
      </span>
      <input
        type="text"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        placeholder={placeholder}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--text-primary)',
          fontSize: '13px',
          width: '100%',
          padding: '8px 10px 8px 0'
        }}
      />
      {localVal && (
        <button
          onClick={() => { setLocalVal(''); onChange(''); }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0 8px',
            fontSize: '12px'
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};
