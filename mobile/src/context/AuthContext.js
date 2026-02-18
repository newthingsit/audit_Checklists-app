import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { AppState, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { setAuthEventListener } from '../services/ApiService';
import { setSentryUser } from '../config/sentry';

const AuthContext = createContext();

// Token storage key
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';
const TOKEN_BASE_URL_KEY = 'auth_token_base_url';

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
  const [token, setToken] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const refreshTokenRef = useRef(null);

  const appState = useRef(AppState.currentState);
  const isHandlingAuthError = useRef(false);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        timeout: 15000 // 15 second timeout for auth requests
      });
      const userData = response.data.user;
      setUser(userData);
      // Set Sentry user context for crash reports
      setSentryUser(userData);
      return userData;
    } catch (error) {
      // Only clear auth if it's an authentication error (401/403)
      // Don't clear on network errors (503, timeout, etc.) - these will be retried
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
      }
      // Don't log 503 or timeout errors - they're being retried automatically
      if (error.response?.status !== 503 && error.code !== 'ECONNABORTED' && error.code !== 'ETIMEDOUT' && !error.message?.includes('timeout')) {
        if (__DEV__) {
          console.error('Error fetching user:', error.message);
        }
      }
      throw error;
    }
  }, []);

  const refreshPromiseRef = useRef(null);
  const silentRefresh = useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    const currentRefreshToken = refreshTokenRef.current || await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!currentRefreshToken) return null;

    refreshPromiseRef.current = axios
      .post(`${API_BASE_URL}/auth/refresh`, { refreshToken: currentRefreshToken }, { timeout: 15000 })
      .then(async (res) => {
        const { token: newToken, refreshToken: newRefresh } = res.data || {};
        if (!newToken) return null;
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
        if (newRefresh) {
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh);
          refreshTokenRef.current = newRefresh;
        }
        setToken(newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        return newToken;
      })
      .catch(async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
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

  // Track last refresh time to prevent excessive API calls
  const lastRefreshTime = useRef(0);
  const REFRESH_COOLDOWN = 30000; // 30 seconds minimum between refreshes

  // Public function to refresh user data (useful when role/permissions change)
  // Throttled to prevent excessive API calls (429 errors)
  const refreshUser = useCallback(async (force = false) => {
    if (!token) {
      return null;
    }
    
    // Check cooldown unless force refresh is requested
    const now = Date.now();
    if (!force && (now - lastRefreshTime.current) < REFRESH_COOLDOWN) {
      // Return current user data without making API call
      return user;
    }
    
    try {
      lastRefreshTime.current = now;
      return await fetchUser();
    } catch (error) {
      // Don't log 503 or timeout errors - they're being retried automatically
      if (error.response?.status !== 503 && error.code !== 'ECONNABORTED' && error.code !== 'ETIMEDOUT' && !error.message?.includes('timeout')) {
        if (__DEV__) {
          console.error('Error refreshing user:', error.message);
        }
      }
      return null;
    }
  }, [token, fetchUser, user]);

  const loadStoredAuth = useCallback(async () => {
    try {
      // Use SecureStore for encrypted token storage
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      const storedBaseUrl = await SecureStore.getItemAsync(TOKEN_BASE_URL_KEY);
      
      if (storedToken && storedBaseUrl && storedBaseUrl !== API_BASE_URL) {
        // Token belongs to a different backend - force re-login to avoid 401s
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(TOKEN_BASE_URL_KEY);
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
        return;
      }
      if (storedRefreshToken) {
        refreshTokenRef.current = storedRefreshToken;
      }
      if (storedToken) {
        setToken(storedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        await fetchUser();
      }
    } catch (error) {
      // Don't log 503 or timeout errors - they're being retried automatically
      if (error.response?.status !== 503 && error.code !== 'ECONNABORTED' && error.code !== 'ETIMEDOUT' && !error.message?.includes('timeout')) {
        console.error('Error loading stored auth:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchUser]);

  // Handle auth errors from ApiService (401 errors)
  const handleAuthError = useCallback(async (event) => {
    if (isHandlingAuthError.current) return;
    isHandlingAuthError.current = true;
    
    if (event.type === 'AUTH_ERROR') {
      setSessionExpired(true);
      
      // Show alert and logout
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please login again.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await logout();
              isHandlingAuthError.current = false;
              setSessionExpired(false);
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, []);

  useEffect(() => {
    // Set up auth event listener for 401 errors
    setAuthEventListener(handleAuthError);

    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;

        if (
          status === 401 &&
          !originalRequest?._retry &&
          !originalRequest?.url?.includes('/auth/refresh') &&
          !originalRequest?.url?.includes('/auth/login')
        ) {
          originalRequest._retry = true;
          const newToken = await silentRefresh();
          if (newToken) {
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${newToken}`,
            };
            return axios(originalRequest);
          }
        }

        if (status === 401 || status === 403) {
          handleAuthError({ type: 'AUTH_ERROR', message: 'Session expired. Please login again.' });
        }
        return Promise.reject(error);
      }
    );
    
    loadStoredAuth();

    // Listen for app state changes to refresh user data when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        token
      ) {
        // App has come to the foreground, refresh user data
        refreshUser();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
      axios.interceptors.response.eject(interceptorId);
      setAuthEventListener(null);
    };
  }, [token, loadStoredAuth, refreshUser, handleAuthError]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password }, {
        timeout: 15000 // 15 second timeout for login requests
      });
      
      if (!response.data || !response.data.token) {
        throw new Error('Invalid response from server');
      }
      
      const { token: newToken, refreshToken: newRefresh, user: userData } = response.data;
      // Use SecureStore for encrypted token storage
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      if (newRefresh) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh);
        refreshTokenRef.current = newRefresh;
      }
      await SecureStore.setItemAsync(TOKEN_BASE_URL_KEY, API_BASE_URL);
      setToken(newToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return response.data;
    } catch (error) {
      // Don't log sensitive data in production
      if (__DEV__) {
        // Don't log 503 or timeout errors - they're being retried automatically
        if (error.response?.status !== 503 && error.code !== 'ECONNABORTED' && error.code !== 'ETIMEDOUT' && !error.message?.includes('timeout')) {
          console.error('Login error:', error.message);
        }
      }
      throw error;
    }
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, { email, password, name });
    const { token: newToken, refreshToken: newRefresh, user: userData } = response.data;
    // Use SecureStore for encrypted token storage
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    if (newRefresh) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh);
      refreshTokenRef.current = newRefresh;
    }
    await SecureStore.setItemAsync(TOKEN_BASE_URL_KEY, API_BASE_URL);
    setToken(newToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    return response.data;
  };

  const logout = async () => {
    // Use SecureStore for token removal
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(TOKEN_BASE_URL_KEY);
    setToken(null);
    setUser(null);
    refreshTokenRef.current = null;
    delete axios.defaults.headers.common['Authorization'];
    // Clear Sentry user context
    setSentryUser(null);
  };

  // Login with existing token (for biometric auth)
  const loginWithToken = async (storedToken, email) => {
    try {
      // Validate token is still valid
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      
      const response = await axios.get(`${API_BASE_URL}/auth/me`);
      
      if (response.data && response.data.user) {
        await SecureStore.setItemAsync(TOKEN_KEY, storedToken);
        await SecureStore.setItemAsync(TOKEN_BASE_URL_KEY, API_BASE_URL);
        setToken(storedToken);
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      } else {
        throw new Error('Invalid token');
      }
    } catch (error) {
      // Token is invalid, clean up
      delete axios.defaults.headers.common['Authorization'];
      if (__DEV__) {
        console.error('Token login failed:', error.message);
      }
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    loginWithToken,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    sessionExpired
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};