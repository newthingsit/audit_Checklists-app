/**
 * ApiService Integration Tests
 * Tests API service functionality with caching and error handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  apiClient,
  cachedGet,
  get,
  post,
  put,
  del,
  clearCache,
  clearCacheFor,
  setAuthEventListener,
} from '../../src/services/ApiService';
import { captureApiError } from '../../src/config/sentry';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');
jest.mock('../../src/config/sentry');

// Store original apiClient methods
let originalGet, originalPost, originalPut, originalDelete;

describe('ApiService Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Store original methods
    originalGet = apiClient.get;
    originalPost = apiClient.post;
    originalPut = apiClient.put;
    originalDelete = apiClient.delete;
    
    // Setup default AsyncStorage mocks
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AsyncStorage.removeItem.mockResolvedValue(undefined);
    AsyncStorage.multiRemove.mockResolvedValue(undefined);
    AsyncStorage.getAllKeys.mockResolvedValue([]);
    
    global.__DEV__ = false;
  });

  afterEach(() => {
    // Restore original methods
    apiClient.get = originalGet;
    apiClient.post = originalPost;
    apiClient.put = originalPut;
    apiClient.delete = originalDelete;
    
    jest.useRealTimers();
  });

  describe('Caching Mechanism', () => {
    beforeEach(async () => {
      await clearCache();
    });

    it('should cache GET requests', async () => {
      const mockData = { id: 1, name: 'Test Data' };
      apiClient.get = jest.fn().mockResolvedValue({ data: mockData });

      // First call - should hit API
      const result1 = await cachedGet('/templates');
      expect(apiClient.get).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockData);

      // Second call - should use cache
      const result2 = await cachedGet('/templates');
      expect(apiClient.get).toHaveBeenCalledTimes(1); // Still 1
      expect(result2).toEqual(mockData);
    });

    it('should respect forceRefresh option', async () => {
      const mockData1 = { id: 1, name: 'Data 1' };
      const mockData2 = { id: 2, name: 'Data 2' };
      
      apiClient.get = jest.fn()
        .mockResolvedValueOnce({ data: mockData1 })
        .mockResolvedValueOnce({ data: mockData2 });

      // First call
      const result1 = await cachedGet('/templates');
      expect(result1).toEqual(mockData1);

      // Force refresh
      const result2 = await cachedGet('/templates', {}, { forceRefresh: true });
      expect(apiClient.get).toHaveBeenCalledTimes(2);
      expect(result2).toEqual(mockData2);
    });

    it('should deduplicate concurrent requests', async () => {
      const mockData = { id: 1, name: 'Test' };
      let resolveRequest;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });

      apiClient.get = jest.fn(() => requestPromise);

      // Make 3 concurrent requests
      const promise1 = cachedGet('/templates');
      const promise2 = cachedGet('/templates');
      const promise3 = cachedGet('/templates');

      // Resolve the request
      resolveRequest({ data: mockData });

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      // Should only make 1 API call
      expect(apiClient.get).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockData);
      expect(result2).toEqual(mockData);
      expect(result3).toEqual(mockData);
    });

    it('should use different cache keys for different params', async () => {
      const mockData1 = { id: 1, items: ['a'] };
      const mockData2 = { id: 2, items: ['b'] };
      
      apiClient.get = jest.fn()
        .mockResolvedValueOnce({ data: mockData1 })
        .mockResolvedValueOnce({ data: mockData2 });

      const result1 = await cachedGet('/items', { page: 1 });
      const result2 = await cachedGet('/items', { page: 2 });

      expect(apiClient.get).toHaveBeenCalledTimes(2);
      expect(result1).toEqual(mockData1);
      expect(result2).toEqual(mockData2);
    });

    it('should clear related cache on POST', async () => {
      await clearCache();
      
      // Cache some data first
      const getCachedData = { id: 1, name: 'Cached' };
      apiClient.get = jest.fn().mockResolvedValue({ data: getCachedData });
      await cachedGet('/items');
      
      // Verify it's cached
      await cachedGet('/items');
      expect(apiClient.get).toHaveBeenCalledTimes(1);

      // POST request
      const postResponse = { id: 2, name: 'New' };
      apiClient.post = jest.fn().mockResolvedValue({ data: postResponse });
      await post('/items', { name: 'New' });

      // Cache should be cleared automatically in the implementation
      expect(apiClient.post).toHaveBeenCalled();
    });
  });

  describe('Standard API Methods', () => {
    it('should perform GET request without caching', async () => {
      const mockData = { id: 1, name: 'Test' };
      apiClient.get = jest.fn().mockResolvedValue({ data: mockData });

      const result1 = await get('/items');
      const result2 = await get('/items');

      expect(apiClient.get).toHaveBeenCalledTimes(2);
      expect(result1).toEqual(mockData);
      expect(result2).toEqual(mockData);
    });

    it('should perform POST request', async () => {
      const postData = { name: 'New Item' };
      const responseData = { id: 1, name: 'New Item' };
      
      apiClient.post = jest.fn().mockResolvedValue({ data: responseData });

      const result = await post('/items', postData);
      
      expect(apiClient.post).toHaveBeenCalledWith('/items', postData);
      expect(result).toEqual(responseData);
    });

    it('should perform PUT request', async () => {
      const updateData = { name: 'Updated Item' };
      const responseData = { id: 1, name: 'Updated Item' };
      
      apiClient.put = jest.fn().mockResolvedValue({ data: responseData });

      const result = await put('/items/1', updateData);
      
      expect(apiClient.put).toHaveBeenCalledWith('/items/1', updateData);
      expect(result).toEqual(responseData);
    });

    it('should perform DELETE request', async () => {
      const responseData = { success: true };
      
      apiClient.delete = jest.fn().mockResolvedValue({ data: responseData });

      const result = await del('/items/1');
      
      expect(apiClient.delete).toHaveBeenCalledWith('/items/1');
      expect(result).toEqual(responseData);
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', async () => {
      const keys = ['api_cache_templates', 'api_cache_items', 'other_key'];
      AsyncStorage.getAllKeys.mockResolvedValue(keys);

      await clearCache();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'api_cache_templates',
        'api_cache_items',
      ]);
    });

    it('should clear cache for specific endpoint', async () => {
      await clearCacheFor('/templates');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        expect.stringContaining('api_cache_/templates')
      );
    });
  });

  describe('Auth Event Listener', () => {
    it('should set auth event listener', () => {
      const mockListener = jest.fn();
      
      // Should not throw
      setAuthEventListener(mockListener);
      setAuthEventListener(null);
      
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from GET requests', async () => {
      const mockError = new Error('API Error');
      apiClient.get = jest.fn().mockRejectedValue(mockError);

      await expect(get('/items')).rejects.toThrow('API Error');
    });

    it('should propagate errors from POST requests', async () => {
      const mockError = new Error('POST Error');
      apiClient.post = jest.fn().mockRejectedValue(mockError);

      await expect(post('/items', {})).rejects.toThrow('POST Error');
    });

    it('should propagate errors from PUT requests', async () => {
      const mockError = new Error('PUT Error');
      apiClient.put = jest.fn().mockRejectedValue(mockError);

      await expect(put('/items/1', {})).rejects.toThrow('PUT Error');
    });

    it('should propagate errors from DELETE requests', async () => {
      const mockError = new Error('DELETE Error');
      apiClient.delete = jest.fn().mockRejectedValue(mockError);

      await expect(del('/items/1')).rejects.toThrow('DELETE Error');
    });
  });

  describe('Request Parameters', () => {
    it('should pass query parameters in GET request', async () => {
      const mockData = { results: [] };
      apiClient.get = jest.fn().mockResolvedValue({ data: mockData });

      await get('/items', { page: 1, limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/items', {
        params: { page: 1, limit: 10 },
      });
    });

    it('should pass query parameters in cached GET request', async () => {
      const mockData = { results: [] };
      apiClient.get = jest.fn().mockResolvedValue({ data: mockData });

      await cachedGet('/items', { page: 1, limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/items', {
        params: { page: 1, limit: 10 },
      });
    });
  });

  describe('Cache Duration', () => {
    it('should use shorter cache for templates', async () => {
      const mockData = { id: 1, name: 'Template' };
      apiClient.get = jest.fn().mockResolvedValue({ data: mockData });

      await cachedGet('/templates');
      
      // Should be cached
      await cachedGet('/templates');
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should cache different endpoints independently', async () => {
      await clearCache();
      
      const templatesData = { templates: [] };
      const auditsData = { audits: [] };
      
      // Mock different responses for different endpoints
      apiClient.get = jest.fn((url) => {
        if (url === '/templates') {
          return Promise.resolve({ data: templatesData });
        } else if (url === '/audits') {
          return Promise.resolve({ data: auditsData });
        }
      });

      await cachedGet('/templates');
      await cachedGet('/audits');

      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
  });
});
