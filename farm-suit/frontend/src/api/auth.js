import { apiClient } from './client';

export const authApi = {
  getCsrf: () => apiClient('/api/accounts/csrf/'),
  login: (username, password) => apiClient('/api/accounts/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }),
  logout: () => apiClient('/api/accounts/logout/', { method: 'POST' }),
  getMe: () => apiClient('/api/accounts/me/')
};
