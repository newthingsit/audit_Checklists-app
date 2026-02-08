import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Token storage keys
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Secure token storage utilities
 * Uses memory as primary storage with sessionStorage as fallback for page refreshes
 * This is more secure than localStorage as:
 * 1. Memory-first approach limits XSS exposure
 * 2. sessionStorage clears on browser close
 * 3. Token is not persisted across browser sessions
 */
class TokenStorage {
  constructor() {
    this.memoryToken = null;
    this.memoryRefreshToken = null;
  }

  get() {
    if (this.memoryToken) return this.memoryToken;
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  getRefresh() {
    if (this.memoryRefreshToken) return this.memoryRefreshToken;
    try {
      return sessionStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  set(token, refreshToken) {
    this.memoryToken = token;
    if (refreshToken !== undefined) this.memoryRefreshToken = refreshToken;
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
      }
      if (refreshToken !== undefined) {
        if (refreshToken) {
          sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        } else {
          sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      }
    } catch {
      // sessionStorage not available, memory-only mode
    }
  }

  clear() {
    this.memoryToken = null;
    this.memoryRefreshToken = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // sessionStorage not available
    }
  }
}

const tokenStorage = new TokenStorage();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => tokenStorage.get());
  const initializedRef = useRef(false);
  const refreshPromiseRef = useRef(null);

  // Silent token refresh — called when a 401 is received
  const silentRefresh = useCallback(async () => {
    // Deduplicate concurrent refresh calls
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const currentRefresh = tokenStorage.getRefresh();
    if (!currentRefresh) return null;

    refreshPromiseRef.current = axios
      .post('/api/auth/refresh', { refreshToken: currentRefresh })
      .then((res) => {
        const { token: newToken, refreshToken: newRefresh } = res.data;
        tokenStorage.set(newToken, newRefresh);
        setToken(newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        return newToken;
      })
      .catch(() => {
        // Refresh failed → force logout
        tokenStorage.clear();
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
        return null;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    return refreshPromiseRef.current;
  }, []);

  // Axios response interceptor — auto-refresh on 401
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        // Only retry once, and not for the refresh endpoint itself
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/refresh') &&
          !originalRequest.url?.includes('/auth/login')
        ) {
          originalRequest._retry = true;
          const newToken = await silentRefresh();
          if (newToken) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return axios(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptorId);
  }, [silentRefresh]);

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []); // Only run once on mount

  // Update axios header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      tokenStorage.clear();
      setToken(null);
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    // Retry logic for cold start issues (Azure App Service may need warmup)
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post('/api/auth/login', { email, password });
        const { token: newToken, refreshToken: newRefresh, user: userData } = response.data;
        tokenStorage.set(newToken, newRefresh);
        setToken(newToken);
        setUser(userData);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        return response.data;
      } catch (error) {
        lastError = error;
        // Only retry on 500 errors (server errors) or network issues
        const status = error.response?.status;
        const isRetryable = status === 500 || status === 502 || status === 503 || !status;
        
        if (attempt < maxRetries && isRetryable) {
          console.log(`Login attempt ${attempt} failed, retrying in ${attempt * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }
        break;
      }
    }
    
    throw lastError;
  };

  const register = async (email, password, name) => {
    const response = await axios.post('/api/auth/register', { email, password, name });
    const { token: newToken, refreshToken: newRefresh, user: userData } = response.data;
    tokenStorage.set(newToken, newRefresh);
    setToken(newToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    return response.data;
  };

  const logout = () => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUser();
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
