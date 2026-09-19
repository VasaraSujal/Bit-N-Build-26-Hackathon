import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextInstance';
import { getToken, setToken, clearAuth, getUser, setUser } from '../lib/auth';
import api from '../lib/api';

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(() => getUser());
  const [token, setTokenState] = useState(() => getToken());
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Restore session on mount by validating token against /api/auth/me
   */
  const restoreSession = useCallback(async () => {
    const storedToken = getToken();

    if (!storedToken) {
      setUserState(null);
      setTokenState(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (response?.data?.user) {
        const verifiedUser = response.data.user;
        setUserState(verifiedUser);
        setTokenState(storedToken);
        setUser(verifiedUser);
      } else {
        throw new Error('Invalid user payload from /auth/me');
      }
    } catch {
      // If token is expired/invalid, clear auth state
      clearAuth();
      setUserState(null);
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();

    // Listen for global 401 unauthorized events from API client
    const handleUnauthorized = () => {
      clearAuth();
      setUserState(null);
      setTokenState(null);
    };

    window.addEventListener('clubops:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('clubops:unauthorized', handleUnauthorized);
    };
  }, [restoreSession]);

  /**
   * Authenticate user with credentials
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<object>} Authenticated user object
   */
  const login = async ({ email, password }) => {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    // 1. Post to /api/auth/login
    const loginRes = await api.post('/auth/login', {
      email: email.trim(),
      password
    });

    if (!loginRes?.data?.token) {
      throw new Error('Authentication response did not contain a valid security token.');
    }

    const authToken = loginRes.data.token;
    setToken(authToken);
    setTokenState(authToken);

    // 2. Fetch authoritative profile from /api/auth/me
    let verifiedUser = loginRes.data.user || null;
    try {
      const meRes = await api.get('/auth/me');
      if (meRes?.data?.user) {
        verifiedUser = meRes.data.user;
      }
    } catch {
      // Fallback to login payload if /me is unreachable
    }

    if (!verifiedUser) {
      throw new Error('Failed to retrieve verified user profile.');
    }

    setUser(verifiedUser);
    setUserState(verifiedUser);

    return verifiedUser;
  };

  /**
   * Log out user and purge credentials
   */
  const logout = () => {
    clearAuth();
    setUserState(null);
    setTokenState(null);
  };

  /**
   * Refresh authoritative user profile from server
   */
  const refreshUser = async () => {
    if (!getToken()) return null;
    try {
      const meRes = await api.get('/auth/me');
      if (meRes?.data?.user) {
        setUser(meRes.data.user);
        setUserState(meRes.data.user);
        return meRes.data.user;
      }
    } catch {
      // Ignore transient errors
    }
    return null;
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
