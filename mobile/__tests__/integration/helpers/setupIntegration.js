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
 */
export const setupAsyncStorage = async (initialData = {}) => {
  await AsyncStorage.clear();

  for (const [key, value] of Object.entries(initialData)) {
    await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  return {
    clear: () => AsyncStorage.clear(),
    set: (key, value) =>
      AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)),
    get: (key) => AsyncStorage.getItem(key),
  };
};

/**
 * Setup common test mocks
 */
export const setupCommonMocks = () => {
  // Mock console methods to reduce noise
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  // Mock timers if needed
  jest.useFakeTimers();

  return {
    cleanup: () => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
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
  jest.useRealTimers();
  jest.restoreAllMocks();
};
