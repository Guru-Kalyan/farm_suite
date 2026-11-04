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
  const [copied, setCopied] = useState(false);
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

  const handleCopyPassword = () => {
    if (result?.temporary_password) {
      navigator.clipboard.writeText(result.temporary_password);
      setCopied(true);
      addToast('Password copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDone = () => {
    setResult(null);
    setPassword('');
    setCopied(false);
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
            fontSize: '13px',
            lineHeight: '1.5'
          }}>
            ✓ Password has been reset successfully for <b>@{user.username}</b>.
            {user.has_pending_reset_request && " Any pending reset request has been marked as resolved."}
          </div>

          {result.temporary_password && (
            <div style={{
              backgroundColor: 'var(--bg-surface-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Temporary Generated Password:
              </span>
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                fontFamily: 'monospace',
                color: 'var(--primary)',
                letterSpacing: '2px'
              }}>
                {result.temporary_password}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Button variant="secondary" onClick={handleCopyPassword}>
                  {copied ? '✓ Copied to Clipboard!' : '📋 Copy Password'}
                </Button>
              </div>

              <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Please securely share this temporary password with the user.
              </p>
            </div>
          )}

          <Button variant="primary" onClick={handleDone}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {user.has_pending_reset_request && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'var(--warning-subtle)',
              border: '1px solid var(--warning)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--warning-text)',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>🔔</span>
              <span>This user submitted a password reset request. Setting a new password will resolve the request.</span>
            </div>
          )}

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
              Update User Password
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
