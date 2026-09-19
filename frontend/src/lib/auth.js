/**
 * Authentication Storage and Token Utilities
 */

const TOKEN_KEY = 'clubops_auth_token';
const USER_KEY = 'clubops_user_profile';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const hasToken = () => {
  const token = getToken();
  return Boolean(token && token.trim().length > 0);
};

export const setToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.warn('Failed to persist token to storage', err);
  }
};

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.warn('Failed to remove token from storage', err);
  }
};

export const isAuthenticated = () => {
  return hasToken();
};

export const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (err) {
    console.warn('Failed to persist user profile', err);
  }
};

export const clearUser = () => {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.warn('Failed to remove user profile', err);
  }
};

export const clearAuth = () => {
  clearToken();
  clearUser();
};
