import React from 'react';
import { useTheme } from '../../theme/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      style={{
        background: 'var(--bg-surface-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-full)',
        padding: '6px 12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        transition: 'all var(--transition-fast)'
      }}
      className="theme-toggle"
    >
      <span>{isDark ? '🌙' : '☀️'}</span>
      <span>{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
};
