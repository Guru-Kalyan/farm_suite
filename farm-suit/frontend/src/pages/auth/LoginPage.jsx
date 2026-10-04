import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const LoginPage = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(username.trim(), password);
      addToast('Welcome back to Farm Suit!', 'success');
    } catch (err) {
      setError(err.message || 'Invalid username or password');
      addToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {error && (
        <div style={{
          padding: '10px 14px',
          backgroundColor: 'var(--danger-subtle)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--danger-text)',
          fontSize: '12.5px',
          fontWeight: '500'
        }}>
          {error}
        </div>
      )}

      <Input
        label="Username"
        name="username"
        required
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter your username"
        disabled={loading}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        disabled={loading}
      />

      <div style={{
        backgroundColor: 'var(--bg-surface-secondary)',
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '11.5px',
        color: 'var(--text-muted)'
      }}>
        💡 <b>Demo Admin Credentials:</b> Username: <code style={{ color: 'var(--primary)' }}>admin</code> | Password: <code style={{ color: 'var(--primary)' }}>admin123</code>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        style={{ width: '100%', marginTop: '6px' }}
      >
        Sign In to Farm Suit
      </Button>
    </form>
  );
};
