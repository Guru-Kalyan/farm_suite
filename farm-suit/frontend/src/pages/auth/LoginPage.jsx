import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

export const LoginPage = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide your username or email, and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(identifier.trim(), password, rememberMe);
      addToast('Welcome back to Farm Suit!', 'success');
    } catch (err) {
      const msg = err.message || 'Invalid username or password';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setForgotInput(identifier);
    setForgotSuccess('');
    setForgotModalOpen(true);
  };

  const handleSendResetRequest = (e) => {
    e.preventDefault();
    if (!forgotInput.trim()) return;
    setForgotSuccess(
      'Password reset request logged. Please contact your Farm Suit System Administrator to receive your temporary access credentials.'
    );
  };

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--danger-subtle)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--danger-text)',
            fontSize: '13px',
            fontWeight: '500',
            lineHeight: '1.4'
          }}>
            ⚠️ {error}
          </div>
        )}

        <Input
          label="Username or Email"
          name="identifier"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="e.g. admin or rahul@example.com"
          disabled={loading}
          autoFocus
        />

        <div style={{ position: 'relative' }}>
          <Input
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            style={{
              position: 'absolute',
              right: '12px',
              top: '35px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '14px',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {/* Remember me & Forgot Password */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12.5px'
        }}>
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            userSelect: 'none',
            color: 'var(--text-secondary)'
          }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: '15px',
                height: '15px',
                accentColor: 'var(--primary)',
                cursor: 'pointer'
              }}
            />
            Remember Me
          </label>

          <a
            href="#forgot-password"
            onClick={handleForgotPassword}
            style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            Forgot Password?
          </a>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface-secondary)',
          border: '1px solid var(--border-subtle)',
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          💡 <b>Admin Demo:</b> User: <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>admin</code> | Pass: <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>admin123</code>
        </div>

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          style={{ width: '100%', marginTop: '6px', padding: '11px 16px', fontSize: '14px' }}
        >
          Sign In to Farm Suit
        </Button>
      </form>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <Modal
          isOpen={forgotModalOpen}
          onClose={() => setForgotModalOpen(false)}
          title="Account Recovery"
        >
          {forgotSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                padding: '12px 14px',
                backgroundColor: 'var(--success-subtle)',
                border: '1px solid var(--success)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--success-text)',
                fontSize: '13px',
                lineHeight: '1.4'
              }}>
                ✓ {forgotSuccess}
              </div>
              <Button variant="secondary" onClick={() => setForgotModalOpen(false)}>
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendResetRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Enter your username or registered email address. Your system administrator will be notified to issue a temporary password.
              </p>
              <Input
                label="Username or Email"
                required
                value={forgotInput}
                onChange={(e) => setForgotInput(e.target.value)}
                placeholder="Enter username or email"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <Button variant="secondary" onClick={() => setForgotModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Request Reset
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
};
