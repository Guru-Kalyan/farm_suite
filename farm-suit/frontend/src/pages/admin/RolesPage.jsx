import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const RolesPage = () => {
  const { addToast } = useToast();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionModules, setPermissionModules] = useState([]);

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPerms, setSelectedPerms] = useState(new Set());
  const [saveLoading, setSaveLoading] = useState(false);

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        adminApi.getRoles(),
        adminApi.getPermissions()
      ]);
      if (rolesRes?.data?.roles) setRoles(rolesRes.data.roles);
      if (permsRes?.data?.modules) setPermissionModules(permsRes.data.modules);
    } catch (err) {
      addToast('Failed to load roles: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDesc('');
    setSelectedPerms(new Set());
    setModalOpen(true);
  };

  const handleOpenEdit = async (role) => {
    try {
      setEditingRole(role);
      setRoleName(role.name);
      setRoleDesc(role.description || '');
      const res = await adminApi.getRole(role.id);
      setSelectedPerms(new Set(res?.data?.permissions || []));
      setModalOpen(true);
    } catch (err) {
      addToast('Failed to load role details', 'error');
    }
  };

  const handleTogglePerm = (code) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) {
      addToast('Role name is required', 'error');
      return;
    }

    try {
      setSaveLoading(true);
      const permsArray = Array.from(selectedPerms);

      if (editingRole) {
        await adminApi.updateRole(editingRole.id, {
          name: roleName.trim(),
          description: roleDesc.trim(),
          permissions: permsArray
        });
        addToast(`Role '${roleName}' updated successfully`, 'success');
      } else {
        await adminApi.createRole({
          name: roleName.trim(),
          description: roleDesc.trim(),
          permissions: permsArray
        });
        addToast(`Role '${roleName}' created successfully`, 'success');
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to save role', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.deleteRole(deleteTarget.id);
      addToast(`Role '${deleteTarget.name}' deleted successfully`, 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to delete role', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>
            Roles & Access Levels
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Configure predefined role blueprints and baseline permission sets.
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenCreate}>
          + Create Custom Role
        </Button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {loading ? (
          <div style={{ padding: '32px', gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading roles...
          </div>
        ) : (
          roles.map((r) => (
            <div
              key={r.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>
                    {r.name}
                  </h3>
                  {r.is_system && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--primary-subtle)',
                      color: 'var(--primary-text)',
                      fontWeight: '700'
                    }}>
                      System
                    </span>
                  )}
                </div>

                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {r.users_count || 0} user{r.users_count === 1 ? '' : 's'} assigned
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {r.description || 'Custom organizational role.'}
              </p>

              <div style={{
                marginTop: 'auto',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)' }}>
                  {r.permissions_count || 0} Permissions
                </span>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(r)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '3px 8px',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    Configure
                  </button>

                  {!r.is_system && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(r)}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '3px 8px',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        color: 'var(--danger-text)'
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Role Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingRole ? `Configure Role: ${editingRole.name}` : 'Create Custom Role'}
          maxWidth="720px"
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Role Name"
              required
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. Field Supervisor"
              disabled={editingRole?.is_system}
            />

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                Description
              </label>
              <textarea
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
                placeholder="Briefly describe what this role does..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>
                  Default Permissions ({selectedPerms.size} Selected)
                </span>
              </div>

              <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {permissionModules.map((mod) => (
                  <div key={mod.module} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                    <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      {mod.module}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px' }}>
                      {mod.permissions.map((p) => {
                        const checked = selectedPerms.has(p.code);
                        return (
                          <label key={p.code} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePerm(p.code)}
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
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saveLoading}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={saveLoading}>
                {editingRole ? 'Save Changes' : 'Create Role'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title={`Delete Role: ${deleteTarget.name}?`}
          message={`Are you sure you want to delete this custom role? This action cannot be undone.`}
          confirmLabel="Delete Role"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
