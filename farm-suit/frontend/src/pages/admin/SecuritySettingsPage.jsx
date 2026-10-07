import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export const SecuritySettingsPage = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    min_password_length: 6,
    require_uppercase: false,
    require_lowercase: false,
    require_number: false,
    require_special_char: false,
    max_login_attempts: 5,
    lockout_duration_minutes: 15,
    session_timeout_minutes: 1440,
    allow_multiple_sessions: true,
    force_logout_inactivity: false,
    updated_at: null
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await adminApi.getSecuritySettings();
        if (res?.data) {
          setSettings(res.data);
        }
      } catch (err) {
        addToast('Failed to load security settings: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [addToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await adminApi.updateSecuritySettings(settings);
      addToast('Security settings successfully updated and applied.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update security settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading security settings...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>
            Security Settings & Policies
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Configure password strength requirements, account lockout rules, and session lifecycle.
          </p>
        </div>

        <Button variant="primary" type="submit" loading={saving}>
          Save Security Policies
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Password Policy Card */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700' }}>
              Password Complexity Policy
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              Enforced whenever users create passwords or perform password resets.
            </p>
          </div>

          <Input
            label="Minimum Password Length"
            type="number"
            min={4}
            max={32}
            value={settings.min_password_length}
            onChange={(e) => setSettings({ ...settings, min_password_length: Number(e.target.value) })}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.require_uppercase}
                onChange={(e) => setSettings({ ...settings, require_uppercase: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
              />
              Require uppercase letter (A-Z)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.require_lowercase}
                onChange={(e) => setSettings({ ...settings, require_lowercase: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
              />
              Require lowercase letter (a-z)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.require_number}
                onChange={(e) => setSettings({ ...settings, require_number: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
              />
              Require number (0-9)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.require_special_char}
                onChange={(e) => setSettings({ ...settings, require_special_char: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
              />
              Require special character (!@#$%^&*)
            </label>
          </div>
        </div>

        {/* Login Security & Lockout Card */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700' }}>
              Login Security & Account Lockout
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              Prevents brute-force credential stuffing and unauthorized entry attempts.
            </p>
          </div>

          <Input
            label="Maximum Failed Login Attempts Before Lockout"
            type="number"
            min={1}
            max={20}
            value={settings.max_login_attempts}
            onChange={(e) => setSettings({ ...settings, max_login_attempts: Number(e.target.value) })}
          />

          <Input
            label="Lockout Duration (Minutes)"
            type="number"
            min={1}
            max={1440}
            value={settings.lockout_duration_minutes}
            onChange={(e) => setSettings({ ...settings, lockout_duration_minutes: Number(e.target.value) })}
          />

          <Input
            label="Session Inactivity Timeout (Minutes)"
            type="number"
            min={5}
            max={10080}
            value={settings.session_timeout_minutes}
            onChange={(e) => setSettings({ ...settings, session_timeout_minutes: Number(e.target.value) })}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.allow_multiple_sessions}
                onChange={(e) => setSettings({ ...settings, allow_multiple_sessions: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
              />
              Allow simultaneous sessions across multiple devices
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.force_logout_inactivity}
                onChange={(e) => setSettings({ ...settings, force_logout_inactivity: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
              />
              Enforce immediate session termination on browser close
            </label>
          </div>
        </div>
      </div>
    </form>
  );
};
