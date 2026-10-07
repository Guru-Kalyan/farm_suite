import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { UserCreateWizard } from './UserCreateWizard';
import { UserEditModal } from './UserEditModal';
import { UserResetPasswordModal } from './UserResetPasswordModal';

export const UsersPage = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTargetUser, setEditTargetUser] = useState(null);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState(null);

  const fetchRoles = async () => {
    try {
      const res = await adminApi.getRoles();
      if (res?.data?.roles) setRoles(res.data.roles);
    } catch (_) {}
  };

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await adminApi.getUsers(params);
      if (res?.data) {
        setUsers(res.data.users || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, addToast]);

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleToggleActiveConfirm = async () => {
    if (!toggleStatusTarget) return;
    try {
      if (toggleStatusTarget.is_active) {
        await adminApi.disableUser(toggleStatusTarget.id);
        addToast(`User ${toggleStatusTarget.username} has been disabled.`, 'success');
      } else {
        await adminApi.enableUser(toggleStatusTarget.id);
        addToast(`User ${toggleStatusTarget.username} has been enabled.`, 'success');
      }
      setToggleStatusTarget(null);
      fetchUsers(pagination.page);
    } catch (err) {
      addToast(err.message || 'Action failed', 'error');
    }
  };

  const renderStatusBadge = (user) => {
    if (user.status === 'locked') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--warning-subtle)',
          color: 'var(--warning-text)',
          fontSize: '11.5px',
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
          gap: '5px',
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--danger-subtle)',
          color: 'var(--danger-text)',
          fontSize: '11.5px',
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
        gap: '5px',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--success-subtle)',
        color: 'var(--success-text)',
        fontSize: '11.5px',
        fontWeight: '700'
      }}>
        🟢 Active
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Title & Add Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>
            User Management
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Administer user accounts, security roles, and granular permissions across Farm Suit.
          </p>
        </div>

        <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
          + Add User
        </Button>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        backgroundColor: 'var(--bg-surface)',
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-xs)'
      }}>
        <div style={{ flex: '1', minWidth: '220px' }}>
          <SearchInput
            placeholder="Search by name, username, email, phone, employee ID..."
            value={search}
            onChange={(val) => setSearch(val)}
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '13px'
          }}
        >
          <option value="">All Roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '13px'
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="disabled">Disabled Only</option>
          <option value="locked">Locked Only</option>
        </select>
      </div>

      {/* User Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{
                backgroundColor: 'var(--bg-surface-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontWeight: '600',
                fontSize: '12px'
              }}>
                <th style={{ padding: '12px 16px' }}>User</th>
                <th style={{ padding: '12px 16px' }}>Email & Phone</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Last Login</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading users directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No users found matching your search criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* User */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-subtle)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '13px'
                        }}>
                          {(u.full_name || u.username)[0].toUpperCase()}
                        </div>
                        <div>
                          <div
                            onClick={() => onNavigate(`/admin/users/${u.id}`)}
                            style={{
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                          >
                            {u.full_name || u.username}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            @{u.username} {u.employee_id ? `• ${u.employee_id}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email & Phone */}
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      <div>{u.email || '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.phone || ''}</div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: u.role?.name === 'Admin' ? 'var(--primary-subtle)' : 'var(--bg-surface-secondary)',
                        color: u.role?.name === 'Admin' ? 'var(--primary-text)' : 'var(--text-primary)',
                        fontWeight: '600',
                        fontSize: '12px',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        {u.role?.name || 'No Role'}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px' }}>
                      {renderStatusBadge(u)}
                    </td>

                    {/* Last Login */}
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {u.last_login || 'Never'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => onNavigate(`/admin/users/${u.id}`)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '4px 8px',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditTargetUser(u)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '4px 8px',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => setResetTargetUser(u)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '4px 8px',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            color: 'var(--primary)'
                          }}
                        >
                          Reset Pwd
                        </button>

                        <button
                          type="button"
                          onClick={() => setToggleStatusTarget(u)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '4px 8px',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            color: u.is_active ? 'var(--danger-text)' : 'var(--success-text)'
                          }}
                        >
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={(p) => fetchUsers(p)}
            />
          </div>
        )}
      </div>

      {/* 5-Step Create User Stepper Wizard */}
      {createModalOpen && (
        <UserCreateWizard
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onUserCreated={() => fetchUsers(1)}
        />
      )}

      {/* Edit User Modal */}
      {editTargetUser && (
        <UserEditModal
          user={editTargetUser}
          isOpen={Boolean(editTargetUser)}
          onClose={() => setEditTargetUser(null)}
          onUserUpdated={() => fetchUsers(pagination.page)}
        />
      )}

      {/* Reset Password Modal */}
      {resetTargetUser && (
        <UserResetPasswordModal
          user={resetTargetUser}
          isOpen={Boolean(resetTargetUser)}
          onClose={() => setResetTargetUser(null)}
          onPasswordReset={() => fetchUsers(pagination.page)}
        />
      )}

      {/* Confirm Status Toggle Dialog */}
      {toggleStatusTarget && (
        <ConfirmDialog
          isOpen={Boolean(toggleStatusTarget)}
          title={toggleStatusTarget.is_active ? 'Disable User Account?' : 'Enable User Account?'}
          message={
            toggleStatusTarget.is_active
              ? `Are you sure you want to disable @${toggleStatusTarget.username}? They will no longer be able to sign in or perform any system actions. Business data remains safely intact.`
              : `Are you sure you want to enable @${toggleStatusTarget.username}? Their account will be restored and lockouts cleared.`
          }
          confirmLabel={toggleStatusTarget.is_active ? 'Disable User' : 'Enable User'}
          variant={toggleStatusTarget.is_active ? 'danger' : 'primary'}
          onConfirm={handleToggleActiveConfirm}
          onCancel={() => setToggleStatusTarget(null)}
        />
      )}
    </div>
  );
};
