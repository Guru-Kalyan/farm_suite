import React from 'react';

export const Select = ({
  label,
  name,
  value,
  onChange,
  options = [], // [{ value, label }] or string array
  placeholder = 'Select an option',
  required = false,
  error = null,
  helperText = '',
  disabled = false,
  style = {},
  ...props
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', ...style }}>
      {label && (
        <label style={{
          fontSize: '12.5px',
          fontWeight: '600',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {label}
          {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--bg-input)',
        border: `1px solid ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden'
      }}>
        <select
          name={name}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '9px 12px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: value ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: '13.5px',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt, idx) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={idx} value={val} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                {lbl}
              </option>
            );
          })}
        </select>
      </div>
      {error && (
        <span style={{ fontSize: '11.5px', color: 'var(--danger)', fontWeight: '500' }}>
          {Array.isArray(error) ? error.join(', ') : error}
        </span>
      )}
      {!error && helperText && (
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
          {helperText}
        </span>
      )}
    </div>
  );
};
