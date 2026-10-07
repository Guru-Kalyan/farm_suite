import React from 'react';
import { Button } from './Button';

export const AccessRestricted = ({ onNavigate }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
      textAlign: 'center',
      minHeight: '60vh'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: 'var(--danger-subtle)',
        color: 'var(--danger)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        marginBottom: '20px'
      }}>
        🔒
      </div>

      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '700',
        color: 'var(--text-primary)',
        margin: '0 0 8px 0',
        fontFamily: 'Outfit, sans-serif'
      }}>
        Access Restricted
      </h2>

      <p style={{
        fontSize: '14.5px',
        color: 'var(--text-secondary)',
        margin: '0 0 6px 0',
        maxWidth: '420px',
        lineHeight: '1.5'
      }}>
        You don't have permission to access this section.
      </p>

      <p style={{
        fontSize: '13px',
        color: 'var(--text-muted)',
        margin: '0 0 24px 0',
        maxWidth: '420px',
        lineHeight: '1.5'
      }}>
        Please contact your Farm Suit administrator.
      </p>

      <Button
        variant="primary"
        onClick={() => onNavigate ? onNavigate('/dashboard') : (window.location.hash = '/dashboard')}
      >
        Go to Dashboard
      </Button>
    </div>
  );
};
