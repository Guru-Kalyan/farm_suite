import React from 'react';

export const Input = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  error = null,
  helperText = '',
  prefix = null,
  suffix = null,
  disabled = false,
  min,
  max,
  step,
  style = {},
  inputStyle = {},
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
        transition: 'border-color var(--transition-fast)',
        overflow: 'hidden'
      }}>
        {prefix && (
          <span style={{
            padding: '0 10px',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-surface-secondary)',
            borderRight: '1px solid var(--border-subtle)',
            fontSize: '13px',
            height: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            {prefix}
          </span>
        )}
        <input
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          style={{
            flex: 1,
            padding: '9px 12px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '13.5px',
            ...inputStyle
          }}
          {...props}
        />
        {suffix && (
          <span style={{
            padding: '0 10px',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-surface-secondary)',
            borderLeft: '1px solid var(--border-subtle)',
            fontSize: '13px',
            height: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            {suffix}
          </span>
        )}
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
