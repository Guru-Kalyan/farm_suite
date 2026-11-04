import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { authApi } from '../../api/auth';
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

  // Account Recovery Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: Request, 2: Admin Key & Password, 3: Staff Request Sent, 4: Admin Success
  const [forgotInput, setForgotInput] = useState('');
  const [resetKey, setResetKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryNotice, setRecoveryNotice] = useState('');
  const [staffSuccessMessage, setStaffSuccessMessage] = useState('');
  const [adminSuccessMessage, setAdminSuccessMessage] = useState('');

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

  const handleOpenRecoveryModal = (e) => {
    e.preventDefault();
    setForgotInput(identifier);
    setResetKey('');
    setNewPassword('');
    setConfirmNewPassword('');
    setRecoveryError('');
    setRecoveryNotice('');
    setStaffSuccessMessage('');
    setAdminSuccessMessage('');
    setRecoveryStep(1);
    setForgotModalOpen(true);
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!forgotInput.trim()) {
      setRecoveryError('Please enter your username or registered email address.');
      return;
    }

    try {
      setRecoveryLoading(true);
      setRecoveryError('');

      const res = await authApi.forgotPassword(forgotInput.trim());

      if (res?.data?.is_admin) {
        // Admin Account: 6-digit key sent to admin email from gurukalyan786@gmail.com
        setRecoveryNotice(res.message || 'A 6-digit password reset key has been sent to your registered email address.');
        addToast('Verification key dispatched to your email!', 'success');
        setRecoveryStep(2);
      } else {
        // Staff Account: Send request to Admin user
        setStaffSuccessMessage(
          res.message || 'Your password reset request has been sent to the Administrator. The Administrator will reset your account password directly.'
        );
        addToast('Reset request sent to Administrator.', 'info');
        setRecoveryStep(3);
      }
    } catch (err) {
      setRecoveryError(err.message || 'Failed to process password recovery request.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleAdminConfirmReset = async (e) => {
    e.preventDefault();
    if (!forgotInput.trim()) {
      setRecoveryError('Username or email is required.');
      return;
    }
    if (!resetKey.trim()) {
      setRecoveryError('Please enter the 6-digit password reset key.');
      return;
    }
    if (!newPassword) {
      setRecoveryError('Please enter a new password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setRecoveryError('New password and confirm password do not match.');
      return;
    }

    try {
      setRecoveryLoading(true);
      setRecoveryError('');

      const res = await authApi.resetPasswordWithKey(
        forgotInput.trim(),
        resetKey.trim(),
        newPassword,
        confirmNewPassword
      );

      setAdminSuccessMessage(res?.message || 'Password successfully reset! You can now log in.');
      addToast('Password reset successfully!', 'success');
      setIdentifier(forgotInput.trim());
      setPassword(newPassword);
      setRecoveryStep(4);
    } catch (err) {
      setRecoveryError(err.message || 'Failed to reset password. Please verify the reset key.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleCloseModal = () => {
    setForgotModalOpen(false);
    setRecoveryStep(1);
    setRecoveryError('');
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
            onClick={handleOpenRecoveryModal}
            style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            Forgot Password?
          </a>
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

      {/* Forgot Password / Account Recovery Modal */}
      {forgotModalOpen && (
        <Modal
          isOpen={forgotModalOpen}
          onClose={handleCloseModal}
          title={
            recoveryStep === 1
              ? "Account Password Recovery"
              : recoveryStep === 2
              ? "Administrator Password Reset"
              : recoveryStep === 3
              ? "Reset Request Submitted"
              : "Password Reset Complete"
          }
          maxWidth="460px"
        >
          {recoveryError && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'var(--danger-subtle)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger-text)',
              fontSize: '12.5px',
              marginBottom: '14px'
            }}>
              ⚠️ {recoveryError}
            </div>
          )}

          {/* STEP 1: ENTER USERNAME/EMAIL & TWO BUTTONS: [Cancel] & [Password Reset] */}
          {recoveryStep === 1 && (
            <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                Enter your username or registered email address to initiate password recovery.
              </p>

              <Input
                label="Username or Email"
                required
                value={forgotInput}
                onChange={(e) => setForgotInput(e.target.value)}
                placeholder="e.g. admin or staff_username"
                disabled={recoveryLoading}
                autoFocus
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <Button variant="secondary" onClick={handleCloseModal} disabled={recoveryLoading}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={recoveryLoading}>
                  Password Reset
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2: ADMIN ONLY - ENTER 6-DIGIT KEY & NEW PASSWORD */}
          {recoveryStep === 2 && (
            <form onSubmit={handleAdminConfirmReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {recoveryNotice && (
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--primary-subtle)',
                  border: '1px solid var(--primary)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--primary-text)',
                  fontSize: '12.5px',
                  lineHeight: '1.4'
                }}>
                  ✉️ {recoveryNotice}
                </div>
              )}

              <Input
                label="Username or Email"
                required
                value={forgotInput}
                onChange={(e) => setForgotInput(e.target.value)}
                placeholder="Enter administrator username or email"
                disabled={recoveryLoading}
              />

              <Input
                label="6-Digit Reset Key / PIN"
                required
                value={resetKey}
                onChange={(e) => setResetKey(e.target.value)}
                placeholder="e.g. 123456"
                disabled={recoveryLoading}
                autoFocus
              />

              <div style={{ position: 'relative' }}>
                <Input
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  disabled={recoveryLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
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
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? '🙈' : '👁️'}
                </button>
              </div>

              <Input
                label="Confirm New Password"
                type={showNewPassword ? 'text' : 'password'}
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-type new password"
                disabled={recoveryLoading}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setRecoveryStep(1);
                    setRecoveryError('');
                  }}
                  disabled={recoveryLoading}
                >
                  &larr; Back
                </Button>

                <Button variant="primary" type="submit" loading={recoveryLoading}>
                  Set New Password
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: STAFF USER - REQUEST SENT CONFIRMATION */}
          {recoveryStep === 3 && (
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
                ✓ {staffSuccessMessage}
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Your administrator has been notified. The administrator will reset your account password and provide you with your access credentials.
              </p>
              <Button variant="primary" onClick={handleCloseModal}>
                Back to Login
              </Button>
            </div>
          )}

          {/* STEP 4: ADMIN SUCCESS */}
          {recoveryStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '14px',
                backgroundColor: 'var(--success-subtle)',
                border: '1px solid var(--success)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--success-text)',
                fontSize: '13px',
                lineHeight: '1.5'
              }}>
                ✓ {adminSuccessMessage}
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Your administrator password has been securely updated. You can now log in with your new credentials.
              </p>
              <Button variant="primary" onClick={handleCloseModal}>
                Proceed to Login
              </Button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
};
