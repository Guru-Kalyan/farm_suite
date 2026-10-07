import { apiClient } from './client';

export const authApi = {
  getCsrf: () => apiClient('/api/accounts/csrf/'),
  login: (usernameOrEmail, password, rememberMe = false) => apiClient('/api/accounts/login/', {
    method: 'POST',
    body: JSON.stringify({ username: usernameOrEmail, password, remember_me: rememberMe })
  }),
  logout: () => apiClient('/api/accounts/logout/', { method: 'POST' }),
  getMe: () => apiClient('/api/accounts/me/'),
  changePassword: (currentPassword, newPassword, confirmPassword) => apiClient('/api/accounts/change-password/', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword
    })
  }),
  forgotPassword: (identifier) => apiClient('/api/accounts/forgot-password/', {
    method: 'POST',
    body: JSON.stringify({ identifier })
  })
};
