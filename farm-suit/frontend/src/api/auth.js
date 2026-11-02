import { apiClient } from './client';

// UTF-8 safe Base64 encoder helper to mask plain text password in browser network payload
const encodeBase64 = (str) => {
  if (!str) return '';
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    return btoa(str);
  }
};

export const authApi = {
  getCsrf: () => apiClient('/api/accounts/csrf/'),
  login: (usernameOrEmail, password, rememberMe = false) => apiClient('/api/accounts/login/', {
    method: 'POST',
    body: JSON.stringify({
      username: usernameOrEmail,
      password: encodeBase64(password),
      is_encoded: true,
      remember_me: rememberMe
    })
  }),
  logout: () => apiClient('/api/accounts/logout/', { method: 'POST' }),
  getMe: () => apiClient('/api/accounts/me/'),
  changePassword: (currentPassword, newPassword, confirmPassword) => apiClient('/api/accounts/change-password/', {
    method: 'POST',
    body: JSON.stringify({
      current_password: encodeBase64(currentPassword),
      new_password: encodeBase64(newPassword),
      confirm_password: encodeBase64(confirmPassword),
      is_encoded: true
    })
  }),
  forgotPassword: (identifier) => apiClient('/api/accounts/forgot-password/', {
    method: 'POST',
    body: JSON.stringify({ identifier })
  })
};
