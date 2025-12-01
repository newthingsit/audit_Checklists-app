import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();

// Token storage key
const TOKEN_KEY = 'auth_token';

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

  const appState = useRef(AppState.currentState);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`);
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      // Only clear auth if it's an authentication error (401/403)
      // Don't clear on network errors or other issues
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
      }
      throw error;
    }
  }, []);

  // Public function to refresh user data (useful when role/permissions change)
  const refreshUser = useCallback(async () => {
    if (!token) {
      return null;
    }
    try {
      return await fetchUser();
    } catch (error) {
      if (__DEV__) {
        console.error('Error refreshing user:', error.message);
      }
      return null;
    }
  }, [token, fetchUser]);

  const loadStoredAuth = useCallback(async () => {
    try {
      // Use SecureStore for encrypted token storage
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        await fetchUser();
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchUser]);

  useEffect(() => {
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
    };
  }, [token, loadStoredAuth, refreshUser]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      
      if (!response.data || !response.data.token) {
        throw new Error('Invalid response from server');
      }
      
      const { token: newToken, user: userData } = response.data;
      // Use SecureStore for encrypted token storage
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return response.data;
    } catch (error) {
      // Don't log sensitive data in production
      if (__DEV__) {
        console.error('Login error:', error.message);
      }
      throw error;
    }
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, { email, password, name });
    const { token: newToken, user: userData } = response.data;
    // Use SecureStore for encrypted token storage
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    return response.data;
  };

  const logout = async () => {
    // Use SecureStore for token removal
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  // Login with existing token (for biometric auth)
  const loginWithToken = async (storedToken, email) => {
    try {
      // Validate token is still valid
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      
      const response = await axios.get(`${API_BASE_URL}/auth/me`);
      
      if (response.data && response.data.user) {
        await SecureStore.setItemAsync(TOKEN_KEY, storedToken);
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
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

