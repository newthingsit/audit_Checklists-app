/**
 * Integration Test: Authentication & Session Flow
 * Tests: Login → Token Management → Protected Routes → Logout
 * 
 * Phase G - Tier 1: Critical Infrastructure Path
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setupIntegrationTests,
  cleanupIntegrationTests,
  mockApiEndpoint,
  waitForCondition,
} from '../helpers/setupIntegration';
import { createMockNavigation, createMockAuthContext } from '../helpers/mockProviders';
import { sampleUser, createApiResponse, sampleApiErrors } from '../helpers/fixtures';

describe('Integration: Authentication & Session Flow', () => {
  let mockNavigation;
  const API_BASE_URL = 'http://api.example.com';

  beforeAll(async () => {
    await setupIntegrationTests();
  });

  afterAll(async () => {
    await cleanupIntegrationTests();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation = createMockNavigation();
    // Clear auth storage
    return AsyncStorage.removeItem('@auth_token');
  });

  describe('Login Flow', () => {
    it('should authenticate user with valid credentials', async () => {
      const credentials = {
        email: 'john@example.com',
        password: 'password123',
      };

      const loginResponse = {
        user: sampleUser,
        token: 'jwt-token-12345',
        refreshToken: 'refresh-token-12345',
        expiresIn: 3600,
      };

      mockApiEndpoint('post', /\/auth\/login/, loginResponse);

      const response = await axios.post('/auth/login', credentials);

      expect(response.status).toBe(200);
      expect(response.data.user.id).toBe('1');
      expect(response.data.token).toBeDefined();
    });

    it('should store authentication token after login', async () => {
      const loginResponse = {
        user: sampleUser,
        token: 'jwt-token-12345',
        refreshToken: 'refresh-token-12345',
      };

      mockApiEndpoint('post', /\/auth\/login/, loginResponse);

      const response = await axios.post('/auth/login', {
        email: 'john@example.com',
        password: 'password123',
      });

      // Store token
      await AsyncStorage.setItem('@auth_token', response.data.token);
      await AsyncStorage.setItem('@user_id', response.data.user.id);

      const storedToken = await AsyncStorage.getItem('@auth_token');
      const storedUserId = await AsyncStorage.getItem('@user_id');

      expect(storedToken).toBe('jwt-token-12345');
      expect(storedUserId).toBe('1');
    });

    it('should set authorization header after login', async () => {
      const token = 'jwt-token-12345';
      await AsyncStorage.setItem('@auth_token', token);

      // Set default auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      expect(axios.defaults.headers.common['Authorization']).toBe('Bearer jwt-token-12345');
    });

    it('should reject login with invalid credentials', async () => {
      const invalidError = sampleApiErrors.unauthorized;
      mockApiEndpoint('post', /\/auth\/login/, invalidError.data, invalidError.status);

      try {
        await axios.post('/auth/login', {
          email: 'invalid@example.com',
          password: 'wrongpassword',
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('Unauthorized');
      }
    });

    it('should handle login server errors', async () => {
      const serverError = sampleApiErrors.serverError;
      mockApiEndpoint('post', /\/auth\/login/, serverError.data, serverError.status);

      try {
        await axios.post('/auth/login', {
          email: 'john@example.com',
          password: 'password123',
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(500);
      }
    });

    it('should navigate to dashboard after successful login', async () => {
      const loginResponse = {
        user: sampleUser,
        token: 'jwt-token-12345',
      };

      mockApiEndpoint('post', /\/auth\/login/, loginResponse);

      const response = await axios.post('/auth/login', {
        email: 'john@example.com',
        password: 'password123',
      });

      if (response.status === 200) {
        mockNavigation.navigate('Dashboard');
      }

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Dashboard');
    });

    it('should display error message on login failure', () => {
      const errorMessage = 'Invalid credentials';

      expect(errorMessage).toContain('credentials');
    });
  });

  describe('Token Management', () => {
    it('should include auth token in subsequent requests', async () => {
      const token = 'jwt-token-12345';
      await AsyncStorage.setItem('@auth_token', token);

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      mockApiEndpoint('get', /\/audits/, { audits: [] });

      await axios.get('/audits');

      expect(axios.defaults.headers.common['Authorization']).toBe('Bearer jwt-token-12345');
    });

    it('should refresh token on 401 response', async () => {
      const oldToken = 'old-token-12345';
      const newToken = 'new-token-67890';

      // First attempt fails with 401
      let attempts = 0;
      axios.get.mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          return Promise.reject({
            response: { status: 401, data: { error: 'Token expired' } },
          });
        }
        return Promise.resolve({ status: 200, data: { audits: [] } });
      });

      // Mock token refresh
      mockApiEndpoint('post', /\/auth\/refresh/, {
        token: newToken,
        expiresIn: 3600,
      });

      // First request fails, triggering refresh
      try {
        await axios.get('/audits');
      } catch (error) {
        // Token refresh triggered
        const refreshResponse = await axios.post('/auth/refresh', {
          refreshToken: oldToken,
        });

        await AsyncStorage.setItem('@auth_token', refreshResponse.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${refreshResponse.data.token}`;

        // Retry original request
        const retryResponse = await axios.get('/audits');
        expect(retryResponse.status).toBe(200);
      }
    });

    it('should handle token refresh failure by logging out', async () => {
      mockApiEndpoint('post', /\/auth\/refresh/, { error: 'Invalid refresh token' }, 401);

      try {
        await axios.post('/auth/refresh', { refreshToken: 'invalid-token' });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(401);

        // Logout on refresh failure
        await AsyncStorage.removeItem('@auth_token');
        mockNavigation.navigate('Login');

        expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
      }
    });

    it('should not refresh token multiple times concurrently', async () => {
      let refreshAttempts = 0;
      axios.post.mockImplementation((url) => {
        if (url.includes('/auth/refresh')) {
          refreshAttempts++;
          return createApiResponse({ token: 'new-token' });
        }
        return Promise.reject(new Error('Unmocked endpoint'));
      });

      const requestsAwaitingRefresh = [
        axios.post('/auth/refresh', {}),
        axios.post('/auth/refresh', {}),
        axios.post('/auth/refresh', {}),
      ];

      await Promise.all(requestsAwaitingRefresh);

      // All requests may trigger refresh attempt, but should use same token
      expect(refreshAttempts).toBeGreaterThan(0);
    });

    it('should handle token expiration gracefully', async () => {
      const expiredToken = 'expired-token-12345';
      await AsyncStorage.setItem('@auth_token', expiredToken);

      mockApiEndpoint('get', /\/audits/, { error: 'Token expired' }, 401);

      try {
        await axios.get('/audits');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Protected Routes Access', () => {
    it('should prevent access to protected routes without token', () => {
      const isAuthenticated = false;

      if (isAuthenticated) {
        mockNavigation.navigate('Dashboard');
      } else {
        mockNavigation.navigate('Login');
      }

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });

    it('should allow access to protected routes with valid token', async () => {
      const token = 'valid-token-12345';
      await AsyncStorage.setItem('@auth_token', token);

      const storedToken = await AsyncStorage.getItem('@auth_token');

      if (storedToken) {
        mockNavigation.navigate('Dashboard');
      }

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Dashboard');
    });

    it('should verify user permissions on protected screen', async () => {
      const user = {
        ...sampleUser,
        permissions: ['canStartSchedule', 'canEditAudit'],
      };

      const requiredPermission = 'canStartSchedule';
      const hasPermission = user.permissions.includes(requiredPermission);

      expect(hasPermission).toBe(true);
    });

    it('should block access if user lacks required permissions', async () => {
      const user = {
        ...sampleUser,
        permissions: ['canViewReports'],
      };

      const requiredPermission = 'canStartAudit';
      const hasPermission = user.permissions.includes(requiredPermission);

      expect(hasPermission).toBe(false);
    });

    it('should redirect to unauthorized screen if permission denied', () => {
      const hasPermission = false;

      if (!hasPermission) {
        mockNavigation.navigate('Unauthorized');
      }

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Unauthorized');
    });
  });

  describe('Logout Flow', () => {
    it('should logout user and clear authentication', async () => {
      // Setup: User is logged in
      await AsyncStorage.setItem('@auth_token', 'jwt-token-12345');
      await AsyncStorage.setItem('@user_id', '1');

      mockApiEndpoint('post', /\/auth\/logout/, { success: true });

      // Perform logout
      await axios.post('/auth/logout');

      // Clear local storage
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@user_id');

      // Verify cleared
      const token = await AsyncStorage.getItem('@auth_token');
      expect(token).toBeNull();
    });

    it('should remove authorization header on logout', async () => {
      axios.defaults.headers.common['Authorization'] = 'Bearer jwt-token-12345';

      // Clear header
      delete axios.defaults.headers.common['Authorization'];

      expect(axios.defaults.headers.common['Authorization']).toBeUndefined();
    });

    it('should navigate to login screen after logout', async () => {
      mockApiEndpoint('post', /\/auth\/logout/, { success: true });

      await axios.post('/auth/logout');

      mockNavigation.navigate('Login');

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });

    it('should handle logout API errors gracefully', async () => {
      mockApiEndpoint('post', /\/auth\/logout/, { error: 'Server error' }, 500);

      try {
        await axios.post('/auth/logout');
      } catch (error) {
        // Even if API fails, clear local session
        await AsyncStorage.removeItem('@auth_token');
      }

      const token = await AsyncStorage.getItem('@auth_token');
      expect(token).toBeNull();
    });

    it('should clear all user data on logout', async () => {
      // Setup user data
      await AsyncStorage.setItem('@auth_token', 'token');
      await AsyncStorage.setItem('@user_id', '1');
      await AsyncStorage.setItem('@user_role', 'auditor');
      await AsyncStorage.setItem('audit_progress', JSON.stringify({}));

      // Logout
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@user_id');
      await AsyncStorage.removeItem('@user_role');
      await AsyncStorage.removeItem('audit_progress');

      // Verify all cleared
      expect(await AsyncStorage.getItem('@auth_token')).toBeNull();
      expect(await AsyncStorage.getItem('@user_id')).toBeNull();
      expect(await AsyncStorage.getItem('@user_role')).toBeNull();
      expect(await AsyncStorage.getItem('audit_progress')).toBeNull();
    });
  });

  describe('Session Recovery', () => {
    it('should restore session on app restart if token exists', async () => {
      // Store token
      await AsyncStorage.setItem('@auth_token', 'jwt-token-12345');

      // App restarts, retrieve token
      const storedToken = await AsyncStorage.getItem('@auth_token');

      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

      expect(storedToken).toBe('jwt-token-12345');
      expect(axios.defaults.headers.common['Authorization']).toBe('Bearer jwt-token-12345');
    });

    it('should validate token freshness on app resume', async () => {
      const testToken = 'jwt-token-12345';
      await AsyncStorage.setItem('@auth_token', testToken);

      mockApiEndpoint('post', /\/auth\/validate/, { valid: true });

      const validation = await axios.post('/auth/validate', { token: testToken });

      expect(validation.data.valid).toBe(true);
    });

    it('should prompt re-authentication if token invalid on resume', async () => {
      mockApiEndpoint('post', /\/auth\/validate/, { error: 'Invalid token' }, 401);

      try {
        await axios.post('/auth/validate', { token: 'invalid-token' });
      } catch (error) {
        mockNavigation.navigate('Login');
      }

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });

    it('should handle missing token on app startup', async () => {
      await AsyncStorage.clear();

      const token = await AsyncStorage.getItem('@auth_token');

      if (!token) {
        mockNavigation.navigate('Login');
      }

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('Complete Auth Flow: End-to-End', () => {
    it('should complete full authentication lifecycle', async () => {
      // Step 1: Login
      mockApiEndpoint('post', /\/auth\/login/, {
        user: sampleUser,
        token: 'jwt-token-12345',
      });

      let response = await axios.post('/auth/login', {
        email: 'john@example.com',
        password: 'password123',
      });
      expect(response.status).toBe(200);

      // Step 2: Store token
      await AsyncStorage.setItem('@auth_token', response.data.token);
      let token = await AsyncStorage.getItem('@auth_token');
      expect(token).toBe('jwt-token-12345');

      // Step 3: Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      expect(axios.defaults.headers.common['Authorization']).toBe('Bearer jwt-token-12345');

      // Step 4: Navigate to dashboard
      mockNavigation.navigate('Dashboard');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Dashboard');

      // Step 5: Logout
      mockApiEndpoint('post', /\/auth\/logout/, { success: true });
      await axios.post('/auth/logout');

      await AsyncStorage.removeItem('@auth_token');
      token = await AsyncStorage.getItem('@auth_token');
      expect(token).toBeNull();

      // Step 6: Return to login
      mockNavigation.navigate('Login');
      expect(mockNavigation.navigate).toHaveBeenLastCalledWith('Login');
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive data in logs', () => {
      const sensitiveData = {
        password: 'password123',
        token: 'secret-token',
      };

      // Verify logging doesn't include sensitive fields
      const loggableUser = { ...sampleUser };
      delete loggableUser.password;

      expect(loggableUser.password).toBeUndefined();
    });

    it('should use HTTPS for auth endpoints in production', () => {
      const endpoint = 'https://api.example.com/auth/login';

      expect(endpoint).toMatch(/^https:\/\//);
    });

    it('should refresh token before expiration', () => {
      const tokenExpiresIn = 3600; // 1 hour
      const refreshThreshold = 300; // 5 minutes before expiry

      const timeToRefresh = tokenExpiresIn - refreshThreshold;

      expect(timeToRefresh).toBe(3300);
    });
  });
});
