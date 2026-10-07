import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../hooks/useToast';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

export const UserEditModal = ({ user: initialUser, isOpen, onClose, onUserUpdated }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [permissionModules, setPermissionModules] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'permissions'

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employeeId: '',
    roleId: '',
    isActive: true,
    forcePasswordChange: false
  });

  useEffect(() => {
    if (!isOpen || !initialUser) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [rolesRes, permsRes, detailRes] = await Promise.all([
          adminApi.getRoles(),
          adminApi.getPermissions(),
          adminApi.getUser(initialUser.id)
        ]);

        if (rolesRes?.data?.roles) setRoles(rolesRes.data.roles);
        if (permsRes?.data?.modules) setPermissionModules(permsRes.data.modules);

        if (detailRes?.data) {
          const u = detailRes.data.user;
          setFormData({
            firstName: u.first_name || '',
            lastName: u.last_name || '',
            email: u.email || '',
            phone: u.phone || '',
            employeeId: u.employee_id || '',
            roleId: u.role?.id || '',
            isActive: u.is_active,
            forcePasswordChange: detailRes.data.force_password_change || false
          });

          const effective = detailRes.data.effective_permissions || [];
          setSelectedPermissions(new Set(effective));
        }
      } catch (err) {
        addToast('Error loading user details: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, initialUser, addToast]);

  const handleRoleChange = async (roleId) => {
    setFormData((prev) => ({ ...prev, roleId }));
    if (!roleId) return;
    try {
      const res = await adminApi.getRole(roleId);
      if (res?.data?.permissions) {
        setSelectedPermissions(new Set(res.data.permissions));
      }
    } catch (_) {}
  };

  const handleTogglePermission = (code) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!initialUser) return;

    try {
      setLoading(true);
      const customPerms = Array.from(selectedPermissions).map((code) => ({
        code,
        policy: 'ALLOW'
      }));

      await adminApi.updateUser(initialUser.id, {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        employee_id: formData.employeeId.trim(),
        role_id: formData.roleId || null,
        is_active: formData.isActive,
        force_password_change: formData.forcePasswordChange,
        custom_permissions: customPerms
      });

      addToast(`User ${initialUser.username} updated successfully.`, 'success');
      onUserUpdated && onUserUpdated();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to update user', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!initialUser) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit User: ${initialUser.full_name || initialUser.username}`}
      maxWidth="780px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: activeTab === 'details' ? '700' : '500',
              color: activeTab === 'details' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'details' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer'
            }}
          >
            Profile & Role
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: activeTab === 'permissions' ? '700' : '500',
              color: activeTab === 'permissions' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'permissions' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer'
            }}
          >
            Custom Permissions ({selectedPermissions.size})
          </button>
        </div>

        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label="Employee ID"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              />
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Assigned Role
                </label>
                <select
                  value={formData.roleId}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                >
                  <option value="">No Role Assigned</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                Account Active (uncheck to disable user and prevent system login)
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.forcePasswordChange}
                  onChange={(e) => setFormData({ ...formData, forcePasswordChange: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                Force password reset on next login
              </label>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {permissionModules.map((mod) => (
              <div key={mod.module} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                <div style={{ fontWeight: '700', fontSize: '12.5px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {mod.module}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px' }}>
                  {mod.permissions.map((p) => {
                    const checked = selectedPermissions.has(p.code);
                    return (
                      <label key={p.code} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleTogglePermission(p.code)}
                          style={{ width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                        />
                        <span>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
