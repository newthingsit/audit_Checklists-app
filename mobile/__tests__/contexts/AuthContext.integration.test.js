/**
 * AuthContext Integration Tests
 * Tests authentication flow with mocked API responses
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { setSentryUser } from '../../src/config/sentry';

// Mock dependencies
jest.mock('axios');
jest.mock('expo-secure-store');
jest.mock('../../src/config/sentry');
jest.mock('../../src/services/ApiService', () => ({
  setAuthEventListener: jest.fn(),
}));

// Mock Alert for session expired handling
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

describe('AuthContext Integration Tests', () => {
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    axios.defaults = { headers: { common: {} } };
    axios.interceptors = {
      response: {
        use: jest.fn(() => 123),
        eject: jest.fn(),
      },
    };
    global.__DEV__ = false;
  });

  describe('Initialization', () => {
    it('should start with loading state', () => {
      SecureStore.getItemAsync = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should finish loading when no stored token', async () => {
      SecureStore.getItemAsync = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should restore session from stored token', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      const mockToken = 'stored-token-123';

      SecureStore.getItemAsync = jest.fn().mockImplementation((key) => {
        if (key === 'auth_token') return Promise.resolve(mockToken);
        if (key === 'auth_token_base_url') return Promise.resolve('http://localhost:5000/api');
        return Promise.resolve(null);
      });

      axios.get = jest.fn().mockResolvedValue({
        data: { user: mockUser },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(axios.defaults.headers.common['Authorization']).toBe(`Bearer ${mockToken}`);
      expect(setSentryUser).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('Login Flow', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      const mockToken = 'auth-token-123';
      const mockRefreshToken = 'refresh-token-456';

      SecureStore.getItemAsync = jest.fn().mockResolvedValue(null);
      SecureStore.setItemAsync = jest.fn().mockResolvedValue(undefined);

      axios.post = jest.fn().mockResolvedValue({
        data: {
          token: mockToken,
          refreshToken: mockRefreshToken,
          user: mockUser,
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('test@example.com', 'password123');
      });

      expect(loginResult).toEqual({
        token: mockToken,
        refreshToken: mockRefreshToken,
        user: mockUser,
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', mockToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', mockRefreshToken);
      expect(axios.defaults.headers.common['Authorization']).toBe(`Bearer ${mockToken}`);
    });

    it('should handle login failure with invalid credentials', async () => {
      SecureStore.getItemAsync = jest.fn().mockResolvedValue(null);

      axios.post = jest.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.login('test@example.com', 'wrongpassword');
        });
      }).rejects.toEqual({
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should handle network errors during login', async () => {
      SecureStore.getItemAsync = jest.fn().mockResolvedValue(null);

      axios.post = jest.fn().mockRejectedValue({
        message: 'Network Error',
        code: 'ECONNABORTED',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.login('test@example.com', 'password123');
        });
      }).rejects.toEqual({
        message: 'Network Error',
        code: 'ECONNABORTED',
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Logout Flow', () => {
    it('should logout and clear all data', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      const mockToken = 'auth-token-123';

      SecureStore.getItemAsync = jest.fn().mockResolvedValue(null);
      SecureStore.setItemAsync = jest.fn().mockResolvedValue(undefined);
      SecureStore.deleteItemAsync = jest.fn().mockResolvedValue(undefined);

      axios.post = jest.fn().mockResolvedValue({
        data: { token: mockToken, user: mockUser },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Login first
      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Now logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(axios.defaults.headers.common['Authorization']).toBeUndefined();
      expect(setSentryUser).toHaveBeenCalledWith(null);
    });
  });

  describe('Register Flow', () => {
    it('should register new user successfully', async () => {
      const mockUser = { id: 2, email: 'newuser@example.com', name: 'New User' };
      const mockToken = 'new-auth-token-123';
      const mockRefreshToken = 'new-refresh-token-456';

      SecureStore.getItemAsync = jest.fn().mockResolvedValue(null);
      SecureStore.setItemAsync = jest.fn().mockResolvedValue(undefined);

      axios.post = jest.fn().mockResolvedValue({
        data: {
          token: mockToken,
          refreshToken: mockRefreshToken,
          user: mockUser,
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let registerResult;
      await act(async () => {
        registerResult = await result.current.register(
          'newuser@example.com',
          'password123',
          'New User'
        );
      });

      expect(registerResult).toEqual({
        token: mockToken,
        refreshToken: mockRefreshToken,
        user: mockUser,
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', mockToken);
    });
  });

  describe('Token Management', () => {
    it('should login with existing token', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      const existingToken = 'existing-token-123';

      SecureStore.getItemAsync = jest.fn().mockResolvedValue(null);
      SecureStore.setItemAsync = jest.fn().mockResolvedValue(undefined);

      axios.get = jest.fn().mockResolvedValue({
        data: { user: mockUser },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.loginWithToken(existingToken, 'test@example.com');
      });

      expect(loginResult).toEqual({
        success: true,
        user: mockUser,
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(axios.defaults.headers.common['Authorization']).toBe(`Bearer ${existingToken}`);
    });

    it('should handle invalid token in loginWithToken', async () => {
      const invalidToken = 'invalid-token';

      SecureStore.getItemAsync = jest.fn().mockResolvedValue(null);

      axios.get = jest.fn().mockRejectedValue({
        response: { status: 401 },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.loginWithToken(invalidToken, 'test@example.com');
        });
      }).rejects.toEqual({
        response: { status: 401 },
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(axios.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });

  describe('User Refresh', () => {
    it('should refresh user data when authenticated', async () => {
      const initialUser = { id: 1, email: 'test@example.com', name: 'Test User', role: 'user' };
      const updatedUser = { id: 1, email: 'test@example.com', name: 'Test User', role: 'admin' };
      const mockToken = 'auth-token-123';

      SecureStore.getItemAsync = jest.fn().mockResolvedValue(null);
      SecureStore.setItemAsync = jest.fn().mockResolvedValue(undefined);

      // First call for login
      axios.post = jest.fn().mockResolvedValue({
        data: { token: mockToken, user: initialUser },
      });

      // Second call for refresh
      axios.get = jest.fn().mockResolvedValue({
        data: { user: updatedUser },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Login first
      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.user.role).toBe('user');

      // Refresh user
      let refreshedUser;
      await act(async () => {
        refreshedUser = await result.current.refreshUser(true);
      });

      expect(refreshedUser).toEqual(updatedUser);
      expect(result.current.user.role).toBe('admin');
      expect(setSentryUser).toHaveBeenCalledWith(updatedUser);
    });

    it('should not refresh when not authenticated', async () => {
      SecureStore.getItemAsync = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let refreshResult;
      await act(async () => {
        refreshResult = await result.current.refreshUser();
      });

      expect(refreshResult).toBeNull();
    });
  });

  describe('Session Restoration', () => {
    it('should clear token if API base URL changed', async () => {
      const mockToken = 'stored-token-123';
      const oldApiUrl = 'http://old-api.example.com/api';

      SecureStore.getItemAsync = jest.fn().mockImplementation((key) => {
        if (key === 'auth_token') return Promise.resolve(mockToken);
        if (key === 'auth_token_base_url') return Promise.resolve(oldApiUrl);
        return Promise.resolve(null);
      });

      SecureStore.deleteItemAsync = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token_base_url');
    });

    it('should handle session restoration errors gracefully', async () => {
      const mockToken = 'stored-token-123';

      SecureStore.getItemAsync = jest.fn().mockImplementation((key) => {
        if (key === 'auth_token') return Promise.resolve(mockToken);
        if (key === 'auth_token_base_url') return Promise.resolve('http://localhost:5000/api');
        return Promise.resolve(null);
      });

      axios.get = jest.fn().mockRejectedValue({
        response: { status: 500 },
        message: 'Server error',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still finish loading even if restoration fails
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 errors during user fetch', async () => {
      const mockToken = 'expired-token';

      SecureStore.getItemAsync = jest.fn().mockImplementation((key) => {
        if (key === 'auth_token') return Promise.resolve(mockToken);
        if (key === 'auth_token_base_url') return Promise.resolve('http://localhost:5000/api');
        return Promise.resolve(null);
      });

      SecureStore.deleteItemAsync = jest.fn().mockResolvedValue(undefined);

      axios.get = jest.fn().mockRejectedValue({
        response: { status: 401 },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
    });

    it('should throw error when useAuth used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = originalError;
    });
  });
});
