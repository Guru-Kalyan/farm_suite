import React from 'react';

export const Button = ({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size = 'md',        // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon = null,
  onClick,
  type = 'button',
  style = {},
  className = '',
  ...props
}) => {
  const getStyles = () => {
    let bg = 'var(--primary)';
    let color = '#ffffff';
    let border = '1px solid transparent';
    let hoverBg = 'var(--primary-hover)';

    if (variant === 'secondary') {
      bg = 'var(--bg-surface-secondary)';
      color = 'var(--text-primary)';
      border = '1px solid var(--border-strong)';
      hoverBg = 'var(--bg-surface-hover)';
    } else if (variant === 'outline') {
      bg = 'transparent';
      color = 'var(--primary)';
      border = '1px solid var(--primary)';
      hoverBg = 'var(--primary-subtle)';
    } else if (variant === 'danger') {
      bg = 'var(--danger)';
      color = '#ffffff';
      border = '1px solid transparent';
      hoverBg = 'var(--danger-hover)';
    } else if (variant === 'ghost') {
      bg = 'transparent';
      color = 'var(--text-secondary)';
      border = '1px solid transparent';
      hoverBg = 'var(--bg-surface-hover)';
    }

    const paddingMap = {
      sm: '6px 12px',
      md: '8px 16px',
      lg: '12px 22px'
    };
    const fontSizeMap = {
      sm: '12px',
      md: '13.5px',
      lg: '15px'
    };

    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      backgroundColor: bg,
      color,
      border,
      padding: paddingMap[size] || paddingMap.md,
      fontSize: fontSizeMap[size] || fontSizeMap.md,
      fontWeight: '600',
      borderRadius: 'var(--radius-sm)',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.6 : 1,
      transition: 'all var(--transition-fast)',
      boxShadow: variant === 'primary' ? 'var(--shadow-sm)' : 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      ...style
    };
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={getStyles()}
      className={`btn-custom ${className}`}
      {...props}
    >
      {loading ? (
        <span style={{
          width: '14px',
          height: '14px',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.6s linear infinite'
        }} />
      ) : icon}
      {children}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};
