import { getToken, clearAuth } from './auth';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Custom API Error class with normalized status and server message
 */
export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Core HTTP Request Wrapper using native fetch
 */
const request = async (endpoint, options = {}) => {
  // Strip leading slashes and duplicate 'api/' prefix if provided
  let cleanEndpoint = endpoint.replace(/^\/+/, '');
  if (cleanEndpoint.startsWith('api/')) {
    cleanEndpoint = cleanEndpoint.substring(4);
  }
  const url = `${API_BASE_URL}/${cleanEndpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    let responseData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      const text = await response.text();
      responseData = text ? { message: text } : null;
    }

    if (!response.ok) {
      // 401 Unauthorized handling for authenticated routes
      if (response.status === 401 && !cleanEndpoint.startsWith('auth/login')) {
        clearAuth();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('clubops:unauthorized'));
        }
      }

      const errorMessage = responseData?.message || `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    const isNetworkErr = err?.name === 'TypeError' || err?.message?.toLowerCase().includes('failed to fetch');
    const userMessage = isNetworkErr
      ? 'Unable to connect to the server. Please check your network connection or try again.'
      : err.message || 'An unexpected network error occurred.';
    throw new ApiError(userMessage, 0);
  }
};

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' })
};

export default api;
