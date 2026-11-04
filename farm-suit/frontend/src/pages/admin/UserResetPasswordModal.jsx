import React, { useState } from 'react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../hooks/useToast';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

export const UserResetPasswordModal = ({ user, isOpen, onClose, onPasswordReset }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('key'); // 'key' or 'direct'
  const [password, setPassword] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [forceChange, setForceChange] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [result, setResult] = useState(null);

  if (!user) return null;

  const handleGenerateKey = async () => {
    try {
      setLoading(true);
      const res = await adminApi.generateResetKey(user.id);
      if (res?.data) {
        setGeneratedKey(res.data);
        addToast(`Reset key generated for ${user.username}`, 'success');
        onPasswordReset && onPasswordReset();
      }
    } catch (err) {
      addToast(err.message || 'Failed to generate reset key', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (generatedKey?.reset_key) {
      navigator.clipboard.writeText(generatedKey.reset_key);
      setCopiedKey(true);
      addToast('Reset key copied to clipboard!', 'success');
      setTimeout(() => setCopiedKey(false), 3000);
    }
  };

  const handleDirectReset = async (e) => {
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
    setGeneratedKey(null);
    setPassword('');
    setCopiedKey(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDone}
      title={`Password Security: ${user.full_name || user.username}`}
      maxWidth="500px"
    >
      {/* Tab Switcher */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '16px',
        gap: '4px'
      }}>
        <button
          type="button"
          onClick={() => { setActiveTab('key'); setResult(null); }}
          style={{
            flex: 1,
            padding: '10px 12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'key' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'key' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'key' ? '700' : '500',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          🔑 Issue Reset Key (Staff Flow)
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('direct'); setGeneratedKey(null); }}
          style={{
            flex: 1,
            padding: '10px 12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'direct' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'direct' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'direct' ? '700' : '500',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          ⚡ Direct Reset
        </button>
      </div>

      {/* TAB 1: GENERATE ONE-TIME RESET KEY */}
      {activeTab === 'key' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
            Generate a secure, single-use password recovery key for <b>@{user.username}</b> ({user.email || 'No email'}). Provide this key to the staff member so they can set their new password.
          </p>

          {generatedKey ? (
            <div style={{
              backgroundColor: 'var(--bg-surface-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                One-Time Staff Reset Key:
              </span>
              <div style={{
                fontSize: '24px',
                fontWeight: '800',
                fontFamily: 'monospace',
                color: 'var(--primary)',
                letterSpacing: '3px'
              }}>
                {generatedKey.reset_key}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <Button variant="secondary" onClick={handleCopyKey}>
                  {copiedKey ? '✓ Copied!' : '📋 Copy Reset Key'}
                </Button>
              </div>

              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Valid for 24 hours. The staff member enters this key under <i>Forgot Password &rarr; I already have a reset key</i> on the login screen.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-surface-secondary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12.5px',
                color: 'var(--text-secondary)'
              }}>
                💡 When staff members forget passwords, generate this key and hand it to them. It keeps user credentials secure without administrators knowing the user's permanent password.
              </div>

              <Button
                variant="primary"
                onClick={handleGenerateKey}
                loading={loading}
                style={{ width: '100%', padding: '10px' }}
              >
                Generate One-Time Reset Key for @{user.username}
              </Button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <Button variant="secondary" onClick={handleDone}>
              {generatedKey ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: DIRECT PASSWORD RESET */}
      {activeTab === 'direct' && (
        <>
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
                ✓ Password has been reset directly!
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
            <form onSubmit={handleDirectReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Directly reset credentials for user <b>@{user.username}</b> ({user.email || 'No email'}).
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
                  Confirm Direct Reset
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </Modal>
  );
};
