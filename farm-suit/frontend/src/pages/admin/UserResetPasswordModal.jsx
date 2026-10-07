import React, { useState } from 'react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../hooks/useToast';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

export const UserResetPasswordModal = ({ user, isOpen, onClose, onPasswordReset }) => {
  const { addToast } = useToast();
  const [password, setPassword] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [forceChange, setForceChange] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await adminApi.resetPassword(user.id, {
        password: autoGenerate ? '' : password,
        force_password_change: forceChange
      });

      if (res?.data) {
        setResult(res.data);
        addToast(`Password reset successfully for ${user.username}`, 'success');
        onPasswordReset && onPasswordReset();
      }
    } catch (err) {
      addToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    setResult(null);
    setPassword('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDone}
      title={`Reset Password: ${user.full_name || user.username}`}
      maxWidth="480px"
    >
      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            padding: '14px',
            backgroundColor: 'var(--success-subtle)',
            border: '1px solid var(--success)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--success-text)',
            fontSize: '13px'
          }}>
            ✓ Password has been reset successfully!
          </div>

          {result.temporary_password && (
            <div style={{
              backgroundColor: 'var(--bg-surface-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Temporary Generated Password:</span>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                fontFamily: 'monospace',
                color: 'var(--primary)',
                marginTop: '6px',
                letterSpacing: '1px'
              }}>
                {result.temporary_password}
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Please safely copy and provide this password to the user.
              </p>
            </div>
          )}

          <Button variant="primary" onClick={handleDone}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Reset access credentials for user <b>@{user.username}</b> ({user.email || 'No email'}).
          </p>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
            />
            Auto-generate secure temporary password
          </label>

          {!autoGenerate && (
            <Input
              label="New Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
            />
          )}

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={forceChange}
              onChange={(e) => setForceChange(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
            />
            Force user to change password on next login
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={handleDone} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={loading}>
              Confirm Password Reset
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
