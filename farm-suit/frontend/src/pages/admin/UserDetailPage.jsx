import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/common/Button';
import { UserEditModal } from './UserEditModal';
import { UserResetPasswordModal } from './UserResetPasswordModal';

export const UserDetailPage = ({ userId, onNavigate }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const fetchUserDetail = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUser(userId);
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      addToast('Failed to load user details: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserDetail();
    }
  }, [userId]);

  const handleToggleStatus = async () => {
    if (!data?.user) return;
    const isCurrentlyActive = data.user.is_active;
    try {
      if (isCurrentlyActive) {
        await adminApi.disableUser(userId);
        addToast(`User ${data.user.username} has been disabled.`, 'success');
      } else {
        await adminApi.enableUser(userId);
        addToast(`User ${data.user.username} has been enabled.`, 'success');
      }
      fetchUserDetail();
    } catch (err) {
      addToast(err.message || 'Operation failed', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading user profile...
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--danger-text)' }}>User not found.</p>
        <Button variant="secondary" onClick={() => onNavigate('/admin/users')}>
          ← Back to Users
        </Button>
      </div>
    );
  }

  const { user, access_summary, recent_activity } = data;

  const getStatusBadge = () => {
    if (user.status === 'locked') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--warning-subtle)',
          color: 'var(--warning-text)',
          fontSize: '12px',
          fontWeight: '700'
        }}>
          🟠 Locked
        </span>
      );
    }
    if (!user.is_active) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--danger-subtle)',
          color: 'var(--danger-text)',
          fontSize: '12px',
          fontWeight: '700'
        }}>
          🔴 Disabled
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--success-subtle)',
        color: 'var(--success-text)',
        fontSize: '12px',
        fontWeight: '700'
      }}>
        🟢 Active
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <button
            type="button"
            onClick={() => onNavigate('/admin/users')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--primary)',
              fontSize: '13px',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '6px',
              fontWeight: '600'
            }}
          >
            ← Back to Users Directory
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>
            {user.full_name || user.username}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            @{user.username} • {user.email || 'No email registered'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => setResetModalOpen(true)}>
            Reset Password
          </Button>
          <Button
            variant={user.is_active ? 'secondary' : 'primary'}
            onClick={handleToggleStatus}
          >
            {user.is_active ? 'Disable Account' : 'Enable Account'}
          </Button>
          <Button variant="primary" onClick={() => setEditModalOpen(true)}>
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Main Info Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        padding: '20px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Employee ID</span>
          <div style={{ fontWeight: '600', fontSize: '14px', marginTop: '2px' }}>
            {user.employee_id || '—'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assigned Role</span>
          <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--primary)', marginTop: '2px' }}>
            {user.role?.name || 'No Role Assigned'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Account Status</span>
          <div style={{ marginTop: '2px' }}>
            {getStatusBadge()}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Phone Number</span>
          <div style={{ fontWeight: '500', fontSize: '14px', marginTop: '2px' }}>
            {user.phone || '—'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Created Date</span>
          <div style={{ fontSize: '13px', marginTop: '2px' }}>
            {user.date_joined || '—'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Last Login</span>
          <div style={{ fontSize: '13px', marginTop: '2px' }}>
            {user.last_login || 'Never logged in'}
          </div>
        </div>
      </div>

      {/* Permissions Breakdown & Activity Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Module Permissions Card */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>
            Module Permissions Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {access_summary && access_summary.map((mod) => (
              <div
                key={mod.module}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: mod.has_any_access ? 'var(--bg-surface-secondary)' : 'transparent',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                    {mod.module}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {mod.granted.length} of {mod.granted.length + mod.denied.length} permissions active
                  </div>
                </div>

                <div style={{ fontSize: '16px', fontWeight: '700' }}>
                  {mod.has_full_access ? (
                    <span style={{ color: 'var(--success)' }}>✓ Full</span>
                  ) : mod.has_any_access ? (
                    <span style={{ color: 'var(--warning-text)' }}>◐ Partial</span>
                  ) : (
                    <span style={{ color: 'var(--danger-text)' }}>✕ Restricted</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Card */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>
            Recent Audit & Security Activity
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {!recent_activity || recent_activity.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                No audit activity logged for this user.
              </div>
            ) : (
              recent_activity.map((act) => (
                <div
                  key={act.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: act.action.includes('LOGIN') ? 'var(--info-subtle)' : 'var(--primary-subtle)',
                      color: act.action.includes('LOGIN') ? 'var(--info-text)' : 'var(--primary-text)'
                    }}>
                      {act.action}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {act.timestamp}
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                    {act.description}
                  </div>
                  {act.ip_address && (
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      IP: {act.ip_address}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editModalOpen && (
        <UserEditModal
          user={user}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onUserUpdated={fetchUserDetail}
        />
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && (
        <UserResetPasswordModal
          user={user}
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          onPasswordReset={fetchUserDetail}
        />
      )}
    </div>
  );
};
