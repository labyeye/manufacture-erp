import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../api/auth';

export const AuthContext = createContext({
  user: null,
  token: null,
  isAdmin: false,
  editableTabs: null,
  allowedTabs: [],
  login: () => {},
  logout: () => {},
  canEdit: () => false,
  loading: true
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem('token');
    if (!stored || stored === "undefined" || stored === "null") return null;
    return stored;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedToken !== "undefined" && storedUser && storedUser !== "undefined") {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);   // show UI immediately while we verify
          setToken(storedToken);

          // Always fetch fresh permissions from server on app load
          const data = await authAPI.me();
          if (data?.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          logout();
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const data = await authAPI.login(username, password);

      setUser(data.user);
      setToken(data.token);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const refreshUser = async () => {
    try {
      const data = await authAPI.me();
      const fresh = data.user;
      setUser(fresh);
      localStorage.setItem('user', JSON.stringify(fresh));
    } catch (error) {
      console.error('Refresh user failed:', error);
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken && storedToken !== 'undefined') refreshUser();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('erp_auth');
    localStorage.removeItem('erp_lastTab');
  };

  const canEdit = (tabId) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    if (user.editableTabs === null) return false; 
    return Array.isArray(user.editableTabs) && user.editableTabs.includes(tabId);
  };

  const value = {
    user,
    token,
    isAdmin: user?.role === 'Admin',
    editableTabs: user?.editableTabs,
    allowedTabs: user?.allowedTabs || [],
    login,
    logout,
    refreshUser,
    canEdit,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
