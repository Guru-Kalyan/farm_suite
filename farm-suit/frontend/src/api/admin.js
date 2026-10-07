import { apiClient } from './client';

export const adminApi = {
  // Users
  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/api/admin/users/${query ? `?${query}` : ''}`);
  },
  getUser: (id) => apiClient(`/api/admin/users/${id}/`),
  createUser: (data) => apiClient('/api/admin/users/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateUser: (id, data) => apiClient(`/api/admin/users/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteUser: (id) => apiClient(`/api/admin/users/${id}/`, {
    method: 'DELETE'
  }),
  disableUser: (id) => apiClient(`/api/admin/users/${id}/disable/`, {
    method: 'POST'
  }),
  enableUser: (id) => apiClient(`/api/admin/users/${id}/enable/`, {
    method: 'POST'
  }),
  resetPassword: (id, data = {}) => apiClient(`/api/admin/users/${id}/reset-password/`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Roles
  getRoles: () => apiClient('/api/admin/roles/'),
  getRole: (id) => apiClient(`/api/admin/roles/${id}/`),
  createRole: (data) => apiClient('/api/admin/roles/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateRole: (id, data) => apiClient(`/api/admin/roles/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteRole: (id) => apiClient(`/api/admin/roles/${id}/`, {
    method: 'DELETE'
  }),

  // Permissions
  getPermissions: () => apiClient('/api/admin/permissions/'),

  // Security Settings
  getSecuritySettings: () => apiClient('/api/admin/security-settings/'),
  updateSecuritySettings: (data) => apiClient('/api/admin/security-settings/', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Audit Logs
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/api/admin/audit-logs/${query ? `?${query}` : ''}`);
  }
};
