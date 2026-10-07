import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      await authApi.getCsrf();
      const res = await authApi.getMe();
      if (res && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch (_) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (usernameOrEmail, password, rememberMe = false) => {
    const res = await authApi.login(usernameOrEmail, password, rememberMe);
    if (res && res.data) {
      setUser(res.data);
      return res.data;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    const res = await authApi.changePassword(currentPassword, newPassword, confirmPassword);
    await fetchCurrentUser();
    return res;
  };

  const hasPermission = useCallback((permCode) => {
    if (!user) return false;
    if (user.is_admin) return true;
    if (!user.permissions || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes(permCode);
  }, [user]);

  const hasAnyPermission = useCallback((permsArray) => {
    if (!user) return false;
    if (user.is_admin) return true;
    if (!user.permissions || !Array.isArray(user.permissions)) return false;
    return permsArray.some((p) => user.permissions.includes(p));
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        changePassword,
        hasPermission,
        hasAnyPermission,
        refreshUser: fetchCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
