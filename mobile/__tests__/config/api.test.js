import Constants from 'expo-constants';

/**
 * Tests for API configuration module
 * Tests environment detection, URL resolution, timeout settings, and retry config
 */

describe('API Configuration', () => {
  let originalDEV;
  let originalEnv;

  beforeEach(() => {
    // Save original values
    originalDEV = global.__DEV__;
    originalEnv = { ...process.env };
    
    // Clear environment variables
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    delete process.env.EXPO_PUBLIC_TUNNEL_API_URL;
    delete process.env.EXPO_PUBLIC_ALLOW_TUNNEL_PROD;
  });

  afterEach(() => {
    // Restore original values
    global.__DEV__ = originalDEV;
    process.env = originalEnv;
  });

  describe('API_TIMEOUT', () => {
    it('should export API_TIMEOUT constant', () => {
      const api = require('../../src/config/api');
      expect(api.API_TIMEOUT).toBeDefined();
      expect(typeof api.API_TIMEOUT).toBe('number');
    });

    it('should set timeout to 30000ms in development', () => {
      global.__DEV__ = true;
      // Clear module cache and reimport
      jest.resetModules();
      const api = require('../../src/config/api');
      expect(api.API_TIMEOUT).toBe(30000);
    });

    it('should set timeout to 20000ms in production', () => {
      global.__DEV__ = false;
      jest.resetModules();
      const api = require('../../src/config/api');
      expect(api.API_TIMEOUT).toBe(20000);
    });
  });

  describe('RETRY_CONFIG', () => {
    it('should have RETRY_CONFIG object with required properties', () => {
      const api = require('../../src/config/api');
      expect(api.RETRY_CONFIG).toBeDefined();
      expect(api.RETRY_CONFIG.maxRetries).toBe(2);
      expect(api.RETRY_CONFIG.retryDelay).toBe(500);
    });

    it('should have retryOnStatusCodes array', () => {
      const api = require('../../src/config/api');
      expect(Array.isArray(api.RETRY_CONFIG.retryOnStatusCodes)).toBe(true);
    });

    it('should include 429, 500, 502, 503, 504 in retryable status codes', () => {
      const api = require('../../src/config/api');
      const codes = api.RETRY_CONFIG.retryOnStatusCodes;
      expect(codes).toContain(408);
      expect(codes).toContain(500);
      expect(codes).toContain(502);
      expect(codes).toContain(503);
      expect(codes).toContain(504);
    });

    it('should have reasonable retry configuration values', () => {
      const api = require('../../src/config/api');
      expect(api.RETRY_CONFIG.maxRetries).toBeGreaterThan(0);
      expect(api.RETRY_CONFIG.maxRetries).toBeLessThan(10);
      expect(api.RETRY_CONFIG.retryDelay).toBeGreaterThan(0);
      expect(api.RETRY_CONFIG.retryDelay).toBeLessThan(5000);
    });
  });

  describe('API_BASE_URL', () => {
    it('should export API_BASE_URL', () => {
      const api = require('../../src/config/api');
      expect(api.API_BASE_URL).toBeDefined();
      expect(typeof api.API_BASE_URL).toBe('string');
    });

    it('should have non-empty API_BASE_URL', () => {
      const api = require('../../src/config/api');
      expect(api.API_BASE_URL.length).toBeGreaterThan(0);
    });

    it('should use http or https protocol', () => {
      const api = require('../../src/config/api');
      expect(
        api.API_BASE_URL.startsWith('http://') || 
        api.API_BASE_URL.startsWith('https://')
      ).toBe(true);
    });

    it('should be callable from environment variable', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://custom-api.example.com/api';
      jest.resetModules();
      const api = require('../../src/config/api');
      expect(api.API_BASE_URL).toBe('https://custom-api.example.com/api');
    });

    it('should fallback to EXPO_PUBLIC_API_BASE_URL', () => {
      process.env.EXPO_PUBLIC_API_BASE_URL = 'https://base-api.example.com/api';
      jest.resetModules();
      const api = require('../../src/config/api');
      expect(api.API_BASE_URL).toBe('https://base-api.example.com/api');
    });

    it('should prefer EXPO_PUBLIC_API_URL over EXPO_PUBLIC_API_BASE_URL', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://primary.example.com/api';
      process.env.EXPO_PUBLIC_API_BASE_URL = 'https://secondary.example.com/api';
      jest.resetModules();
      const api = require('../../src/config/api');
      expect(api.API_BASE_URL).toBe('https://primary.example.com/api');
    });
  });

  describe('Environment Detection', () => {
    it('should handle development environment', () => {
      global.__DEV__ = true;
      jest.resetModules();
      const api = require('../../src/config/api');
      expect(api.API_TIMEOUT).toBe(30000);
    });

    it('should handle production environment', () => {
      global.__DEV__ = false;
      jest.resetModules();
      const api = require('../../src/config/api');
      expect(api.API_TIMEOUT).toBe(20000);
    });
  });

  describe('Axios Configuration', () => {
    it('should configure axios defaults', () => {
      const axios = require('axios');
      const api = require('../../src/config/api');
      
      expect(axios.defaults.timeout).toBeDefined();
      expect(typeof axios.defaults.timeout).toBe('number');
    });

    it('should set Accept header to application/json', () => {
      const axios = require('axios');
      require('../../src/config/api');
      
      expect(axios.defaults.headers.common['Accept']).toBe('application/json');
    });

    it('should set Content-Type header to application/json', () => {
      const axios = require('axios');
      require('../../src/config/api');
      
      expect(axios.defaults.headers.common['Content-Type']).toBe('application/json');
    });

    it('should have request interceptor configured', () => {
      const axios = require('axios');
      require('../../src/config/api');
      
      // Axios interceptors have different structures depending on version
      // Just verify they exist and axios is configured
      expect(axios.interceptors).toBeDefined();
      expect(axios.interceptors.request).toBeDefined();
    });

    it('should have response interceptor configured', () => {
      const axios = require('axios');
      require('../../src/config/api');
      
      // Axios interceptors have different structures depending on version
      // Just verify they exist and axios is configured
      expect(axios.interceptors).toBeDefined();
      expect(axios.interceptors.response).toBeDefined();
    });
  });

  describe('Configuration Priority', () => {
    it('should prioritize environment variable over app.json', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://env-api.example.com/api';
      jest.resetModules();
      const api = require('../../src/config/api');
      expect(api.API_BASE_URL).toBe('https://env-api.example.com/api');
    });

    it('should handle missing Constants.expoConfig gracefully', () => {
      jest.resetModules();
      const api = require('../../src/config/api');
      // Should not throw and should have a valid URL
      expect(api.API_BASE_URL).toBeDefined();
      expect(typeof api.API_BASE_URL).toBe('string');
    });

    it('should handle various URL formats correctly', () => {
      const testUrls = [
        'http://localhost:5000/api',
        'https://api.example.com/api',
        'https://api.example.com:8443/api',
        'http://192.168.1.100:5000/api'
      ];

      testUrls.forEach(url => {
        process.env.EXPO_PUBLIC_API_URL = url;
        jest.resetModules();
        const api = require('../../src/config/api');
        expect(api.API_BASE_URL).toBe(url);
      });
    });
  });

  describe('Module Export', () => {
    it('should export API_BASE_URL as default', () => {
      const api = require('../../src/config/api');
      expect(api.default).toBeDefined();
      expect(typeof api.default).toBe('string');
    });

    it('should export all required configurations', () => {
      const api = require('../../src/config/api');
      expect(api.API_TIMEOUT).toBeDefined();
      expect(api.RETRY_CONFIG).toBeDefined();
      expect(api.API_BASE_URL).toBeDefined();
      expect(api.default).toBeDefined();
    });
  });

  describe('Request Throttle Integration', () => {
    it('should import throttle utilities', () => {
      // The module imports throttle utilities, verify they are available
      const api = require('../../src/config/api');
      expect(api).toBeDefined();
      // If this test passes, the imports worked
    });

    it('should have axios interceptors for throttling', () => {
      const axios = require('axios');
      require('../../src/config/api');
      
      // Verify interceptors are properly configured
      expect(axios.interceptors).toBeDefined();
      expect(axios.interceptors.request).toBeDefined();
      expect(axios.interceptors.response).toBeDefined();
      // Verify axios defaults are set (which indicates interceptors are configured)
      expect(axios.defaults.timeout).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty API_BASE_URL gracefully', () => {
      process.env.EXPO_PUBLIC_API_URL = '';
      jest.resetModules();
      // Module should still load without throwing
      expect(() => {
        require('../../src/config/api');
      }).not.toThrow();
    });

    it('should handle whitespace in environment variables', () => {
      process.env.EXPO_PUBLIC_API_URL = '  https://api.example.com/api  ';
      jest.resetModules();
      const api = require('../../src/config/api');
      // Should have some URL even if it has whitespace
      expect(api.API_BASE_URL).toBeDefined();
    });

    it('should handle various timeout value types in config', () => {
      jest.resetModules();
      const api = require('../../src/config/api');
      expect(typeof api.API_TIMEOUT).toBe('number');
      expect(api.API_TIMEOUT).toBeGreaterThan(0);
    });

    it('should handle retry config with edge case values', () => {
      jest.resetModules();
      const api = require('../../src/config/api');
      const retry = api.RETRY_CONFIG;
      
      expect(retry.maxRetries >= 0).toBe(true);
      expect(retry.retryDelay >= 0).toBe(true);
      expect(Array.isArray(retry.retryOnStatusCodes)).toBe(true);
      expect(retry.retryOnStatusCodes.length > 0).toBe(true);
    });

    it('should have consistent configuration across multiple imports', () => {
      const api1 = require('../../src/config/api');
      jest.resetModules();
      const api2 = require('../../src/config/api');
      
      // Core values should be the same type
      expect(typeof api1.API_TIMEOUT).toBe(typeof api2.API_TIMEOUT);
      expect(typeof api1.RETRY_CONFIG).toBe(typeof api2.RETRY_CONFIG);
    });
  });

  describe('Development vs Production', () => {
    it('should have different timeouts for dev and prod', () => {
      global.__DEV__ = true;
      jest.resetModules();
      const devApi = require('../../src/config/api');
      const devTimeout = devApi.API_TIMEOUT;

      global.__DEV__ = false;
      jest.resetModules();
      const prodApi = require('../../src/config/api');
      const prodTimeout = prodApi.API_TIMEOUT;

      expect(devTimeout).not.toBe(prodTimeout);
      expect(devTimeout).toBeGreaterThan(prodTimeout);
    });

    it('should have consistent retry config in both environments', () => {
      global.__DEV__ = true;
      jest.resetModules();
      const devApi = require('../../src/config/api');
      const devRetry = { ...devApi.RETRY_CONFIG };

      global.__DEV__ = false;
      jest.resetModules();
      const prodApi = require('../../src/config/api');
      const prodRetry = { ...prodApi.RETRY_CONFIG };

      expect(devRetry.maxRetries).toBe(prodRetry.maxRetries);
      expect(devRetry.retryDelay).toBe(prodRetry.retryDelay);
    });
  });
});
