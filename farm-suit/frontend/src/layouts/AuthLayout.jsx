import React from 'react';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const AuthLayout = ({ children }) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-app)',
      padding: '20px',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <ThemeToggle />
      </div>

      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-xl)',
        padding: '36px 30px',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '44px', marginBottom: '8px' }}>🌱</div>
          <h1 style={{ color: 'var(--primary)', fontSize: '1.8rem', marginBottom: '4px' }}>FARM SUIT</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Farm Business Management Platform
          </p>
        </div>

        {children}
      </div>

      <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
        © 2026 Farm Suit. Unified Trading & Direct Farming.
      </div>
    </div>
  );
};
