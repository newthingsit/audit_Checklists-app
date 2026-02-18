/**
 * Integration Test Setup Utilities
 * Common configuration for all integration tests
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://api.example.com';

/**
 * Setup API mocks with interceptor-level control
 * Allows testing retry logic, error handling, etc.
 */
export const setupApiMocks = () => {
  // Store original methods
  const originalGet = axios.get;
  const originalPost = axios.post;
  const originalPut = axios.put;
  const originalDelete = axios.delete;

  // Reset all mocks
  jest.clearAllMocks();
  axios.get = jest.fn();
  axios.post = jest.fn();
  axios.put = jest.fn();
  axios.delete = jest.fn();

  return {
    restore: () => {
      axios.get = originalGet;
      axios.post = originalPost;
      axios.put = originalPut;
      axios.delete = originalDelete;
    },
  };
};

/**
 * Configure axios mock for a specific endpoint
 * @param {string} method - HTTP method (get, post, put, delete)
 * @param {string|RegExp} urlPattern - URL or pattern to match
 * @param {*} response - Response data or function
 * @param {number} status - HTTP status code (default: 200)
 */
export const mockApiEndpoint = (method, urlPattern, response, status = 200) => {
  const mockFn = axios[method];

  mockFn.mockImplementation((url, ...rest) => {
    const isMatch =
      urlPattern instanceof RegExp ? urlPattern.test(url) : url.includes(urlPattern);

    if (isMatch) {
      const responseData = typeof response === 'function' ? response(url, ...rest) : response;

      if (status >= 400) {
        return Promise.reject({
          response: { status, data: responseData },
        });
      }

      return Promise.resolve({ status, data: responseData });
    }

    // Delegate to other handlers or reject
    return Promise.reject(new Error(`Unmocked URL: ${url}`));
  });

  return mockFn;
};

/**
 * Setup AsyncStorage with initial data
 * Note: Uses setTimeout to ensure async operations complete
 */
export const setupAsyncStorage = async (initialData = {}) => {
  // Clear storage
  await AsyncStorage.clear();
  
  // Wait for clear to complete
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Set initial data
  const setPromises = Object.entries(initialData).map(([key, value]) =>
    AsyncStorage.setItem(
      key,
      typeof value === 'string' ? value : JSON.stringify(value)
    )
  );

  await Promise.all(setPromises);
  
  // Ensure all writes complete
  await new Promise((resolve) => setTimeout(resolve, 10));

  return {
    clear: () => AsyncStorage.clear(),
    set: async (key, value) => {
      await AsyncStorage.setItem(
        key,
        typeof value === 'string' ? value : JSON.stringify(value)
      );
      // Ensure write completes
      await new Promise((resolve) => setTimeout(resolve, 5));
    },
    get: async (key) => {
      const value = await AsyncStorage.getItem(key);
      return value;
    },
  };
};

/**
 * Setup common test mocks
 * Note: Does NOT use fake timers for integration tests that rely on real AsyncStorage
 */
export const setupCommonMocks = () => {
  // Mock console methods to reduce noise
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  // NOTE: We do NOT use jest.useFakeTimers() here because:
  // - Integration tests rely on real async operations (AsyncStorage, axios)
  // - Fake timers can cause AsyncStorage operations to hang or fail
  // - Tests need real time for proper async/await behavior

  return {
    cleanup: () => {
      console.log.mockRestore();
      console.warn.mockRestore();
      console.error.mockRestore();
    },
  };
};

/**
 * Wait for condition with timeout
 */
export const waitForCondition = async (condition, timeout = 5000, interval = 100) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Helper to ensure AsyncStorage operations complete
 * Use this instead of directly getting/setting for reliability
 */
export const ensureAsyncStorageOperation = async (operation) => {
  const result = await operation();
  await new Promise((resolve) => setTimeout(resolve, 20));
  return result;
};

/**
 * Global integration test setup (call in beforeAll)
 */
export const setupIntegrationTests = async () => {
  setupCommonMocks();
  setupApiMocks();
  await setupAsyncStorage({
    '@auth_token': 'test-token-12345',
    '@user_id': '1',
    '@user_role': 'auditor',
  });
};

/**
 * Global integration test cleanup (call in afterAll)
 */
export const cleanupIntegrationTests = async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.restoreAllMocks();
};
