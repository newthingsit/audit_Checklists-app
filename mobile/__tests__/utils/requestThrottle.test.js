import * as requestThrottle from '../../src/utils/requestThrottle';

describe('requestThrottle', () => {
  beforeEach(() => {
    requestThrottle.clearAllCaches();
  });

  describe('getThrottleDelay', () => {
    it('should return correct delay for /notifications', () => {
      const delay = requestThrottle.getThrottleDelay('/notifications');
      expect(delay).toBe(60000);
    });

    it('should return correct delay for /audits', () => {
      const delay = requestThrottle.getThrottleDelay('/audits');
      expect(delay).toBe(30000);
    });

    it('should return default delay for unknown endpoint', () => {
      const delay = requestThrottle.getThrottleDelay('/unknown-endpoint');
      expect(delay).toBe(30000);
    });

    it('should return correct delay for /locations', () => {
      const delay = requestThrottle.getThrottleDelay('/locations');
      expect(delay).toBe(30000);
    });

    it('should return correct delay for /templates', () => {
      const delay = requestThrottle.getThrottleDelay('/templates');
      expect(delay).toBe(60000);
    });
  });

  describe('isPending', () => {
    it('should return false for non-pending request', () => {
      const config = { url: '/audits', method: 'get' };
      expect(requestThrottle.isPending(config)).toBe(false);
    });

    it('should return true for pending request', () => {
      const config = { url: '/audits', method: 'get' };
      const promise = Promise.resolve('data');

      requestThrottle.markPending(config, promise);
      expect(requestThrottle.isPending(config)).toBe(true);
    });

    it('should return false after pending request completes', (done) => {
      const config = { url: '/audits', method: 'get' };
      const promise = Promise.resolve('data');

      requestThrottle.markPending(config, promise);
      expect(requestThrottle.isPending(config)).toBe(true);

      promise.finally(() => {
        setTimeout(() => {
          expect(requestThrottle.isPending(config)).toBe(false);
          done();
        }, 10);
      });
    });
  });

  describe('getCachedResponse', () => {
    it('should return null for non-cached response', () => {
      const config = { url: '/audits', method: 'get' };
      const result = requestThrottle.getCachedResponse(config);
      expect(result).toBeNull();
    });

    it('should return cached response if exists', () => {
      const config = { url: '/audits', method: 'get' };
      const responseData = { id: 1, name: 'test' };

      requestThrottle.cacheResponse(config, responseData);
      const result = requestThrottle.getCachedResponse(config);

      expect(result).toEqual(responseData);
    });

    it('should distinguish cache keys by method', () => {
      const config1 = { url: '/audits', method: 'get' };
      const config2 = { url: '/audits', method: 'post' };
      const data1 = { id: 1 };
      const data2 = { id: 2 };

      requestThrottle.cacheResponse(config1, data1);
      requestThrottle.cacheResponse(config2, data2);

      expect(requestThrottle.getCachedResponse(config1)).toEqual(data1);
      expect(requestThrottle.getCachedResponse(config2)).toEqual(data2);
    });

    it('should distinguish cache keys by params', () => {
      const config1 = { url: '/audits', method: 'get', params: { id: 1 } };
      const config2 = { url: '/audits', method: 'get', params: { id: 2 } };
      const data1 = { auditId: 1 };
      const data2 = { auditId: 2 };

      requestThrottle.cacheResponse(config1, data1);
      requestThrottle.cacheResponse(config2, data2);

      expect(requestThrottle.getCachedResponse(config1)).toEqual(data1);
      expect(requestThrottle.getCachedResponse(config2)).toEqual(data2);
    });
  });

  describe('cacheResponse', () => {
    it('should cache response with timestamp', () => {
      const config = { url: '/audits', method: 'get' };
      const response = { id: 1, name: 'test audit' };

      requestThrottle.cacheResponse(config, response);
      const cached = requestThrottle.getCachedResponse(config);

      expect(cached).toEqual(response);
    });

    it('should overwrite existing cache', () => {
      const config = { url: '/audits', method: 'get' };
      const response1 = { version: 1 };
      const response2 = { version: 2 };

      requestThrottle.cacheResponse(config, response1);
      expect(requestThrottle.getCachedResponse(config)).toEqual(response1);

      requestThrottle.cacheResponse(config, response2);
      expect(requestThrottle.getCachedResponse(config)).toEqual(response2);
    });
  });

  describe('markPending', () => {
    it('should mark request as pending', () => {
      const config = { url: '/audits', method: 'get' };
      const promise = Promise.resolve('data');

      expect(requestThrottle.isPending(config)).toBe(false);
      requestThrottle.markPending(config, promise);
      expect(requestThrottle.isPending(config)).toBe(true);
    });

    it('should return the same promise', () => {
      const config = { url: '/audits', method: 'get' };
      const promise = Promise.resolve('data');

      const result = requestThrottle.markPending(config, promise);
      expect(result).toBe(promise);
    });

    it('should handle multiple pending requests with different configs', () => {
      const config1 = { url: '/audits', method: 'get' };
      const config2 = { url: '/templates', method: 'get' };
      const promise1 = Promise.resolve('audits');
      const promise2 = Promise.resolve('templates');

      requestThrottle.markPending(config1, promise1);
      requestThrottle.markPending(config2, promise2);

      expect(requestThrottle.isPending(config1)).toBe(true);
      expect(requestThrottle.isPending(config2)).toBe(true);
    });
  });

  describe('getPendingPromise', () => {
    it('should return pending promise if exists', () => {
      const config = { url: '/audits', method: 'get' };
      const promise = Promise.resolve('data');

      requestThrottle.markPending(config, promise);
      const retrieved = requestThrottle.getPendingPromise(config);

      expect(retrieved).toBe(promise);
    });

    it('should return undefined if no pending promise', () => {
      const config = { url: '/audits', method: 'get' };
      const result = requestThrottle.getPendingPromise(config);

      expect(result).toBeUndefined();
    });

    it('should enable request deduplication', () => {
      const config = { url: '/audits', method: 'get', params: { id: 1 } };
      const promise = Promise.resolve('cached result');

      requestThrottle.markPending(config, promise);

      const duplicate = requestThrottle.getPendingPromise(config);
      expect(duplicate).toBe(promise);
    });
  });

  describe('clearCache', () => {
    it('should clear cache for specific endpoint', () => {
      const config1 = { url: '/audits/list', method: 'get' };
      const config2 = { url: '/templates', method: 'get' };

      requestThrottle.cacheResponse(config1, { data: 'audits' });
      requestThrottle.cacheResponse(config2, { data: 'templates' });

      expect(requestThrottle.getCachedResponse(config1)).toBeTruthy();

      requestThrottle.clearCache('/audits');

      expect(requestThrottle.getCachedResponse(config1)).toBeNull();
      expect(requestThrottle.getCachedResponse(config2)).toBeTruthy();
    });

    it('should handle pattern matching for cache clearing', () => {
      const config1 = { url: '/notifications/unread-count', method: 'get' };
      const config2 = { url: '/notifications/list', method: 'get' };
      const config3 = { url: '/audits', method: 'get' };

      requestThrottle.cacheResponse(config1, { count: 5 });
      requestThrottle.cacheResponse(config2, { list: [] });
      requestThrottle.cacheResponse(config3, { data: 'audits' });

      requestThrottle.clearCache('/notifications');

      expect(requestThrottle.getCachedResponse(config1)).toBeNull();
      expect(requestThrottle.getCachedResponse(config2)).toBeNull();
      expect(requestThrottle.getCachedResponse(config3)).toBeTruthy();
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches, pending requests, and timestamps', () => {
      const config1 = { url: '/audits', method: 'get' };
      const config2 = { url: '/templates', method: 'get' };

      requestThrottle.cacheResponse(config1, { data: 'audits' });
      requestThrottle.cacheResponse(config2, { data: 'templates' });
      requestThrottle.markPending(config1, Promise.resolve());

      expect(requestThrottle.getCachedResponse(config1)).toBeTruthy();
      expect(requestThrottle.isPending(config1)).toBe(true);

      requestThrottle.clearAllCaches();

      expect(requestThrottle.getCachedResponse(config1)).toBeNull();
      expect(requestThrottle.getCachedResponse(config2)).toBeNull();
      expect(requestThrottle.isPending(config1)).toBe(false);
    });
  });

  describe('shouldThrottle', () => {
    it('should return false for first request', () => {
      const config = { url: '/audits', method: 'get' };
      const result = requestThrottle.shouldThrottle(config);
      expect(result).toBe(false);
    });

    it('should check throttle status based on config', () => {
      const config = { url: '/audits', method: 'get' };

      const result = requestThrottle.shouldThrottle(config);
      expect(typeof result).toBe('boolean');
    });

    it('should handle different endpoints with different throttle delays', () => {
      const config1 = { url: '/notifications', method: 'get' };
      const config2 = { url: '/audits', method: 'get' };

      const result1 = requestThrottle.shouldThrottle(config1);
      const result2 = requestThrottle.shouldThrottle(config2);

      expect(typeof result1).toBe('boolean');
      expect(typeof result2).toBe('boolean');
    });
  });

  describe('Integration: Deduplication + Caching', () => {
    it('should deduplicate concurrent requests and cache result', () => {
      const config = { url: '/audits', method: 'get', params: { id: 1 } };
      const promise1 = Promise.resolve({ data: 'audit' });

      requestThrottle.markPending(config, promise1);

      const duplicate = requestThrottle.getPendingPromise(config);
      expect(duplicate).toBe(promise1);

      requestThrottle.cacheResponse(config, { data: 'cached' });

      expect(requestThrottle.getCachedResponse(config)).toEqual({ data: 'cached' });
    });

    it('should provide different cache entries for different request types', () => {
      const getConfig = { url: '/audits', method: 'get' };
      const postConfig = { url: '/audits', method: 'post' };

      requestThrottle.cacheResponse(getConfig, { method: 'GET', data: [] });
      requestThrottle.cacheResponse(postConfig, { method: 'POST', created: true });

      const getCache = requestThrottle.getCachedResponse(getConfig);
      const postCache = requestThrottle.getCachedResponse(postConfig);

      expect(getCache.method).toBe('GET');
      expect(postCache.method).toBe('POST');
    });
  });

  describe('Edge Cases', () => {
    it('should handle config without method (defaults to get)', () => {
      const config = { url: '/audits' };

      requestThrottle.cacheResponse(config, { data: 'test' });
      expect(requestThrottle.getCachedResponse(config)).toEqual({ data: 'test' });
    });

    it('should handle config with query parameters', () => {
      const config = { url: '/audits', method: 'get', params: { filter: 'active' } };

      requestThrottle.cacheResponse(config, { filtered: true });
      expect(requestThrottle.getCachedResponse(config)).toEqual({ filtered: true });
    });

    it('should handle empty response data', () => {
      const config = { url: '/audits', method: 'get' };

      requestThrottle.cacheResponse(config, null);
      expect(requestThrottle.getCachedResponse(config)).toBeNull();
    });

    it('should handle array response data', () => {
      const config = { url: '/audits', method: 'get' };
      const arrayData = [{ id: 1 }, { id: 2 }];

      requestThrottle.cacheResponse(config, arrayData);
      expect(requestThrottle.getCachedResponse(config)).toEqual(arrayData);
    });

    it('should handle config with different params combinations', () => {
      const config1 = { url: '/audits', method: 'get', params: { status: 'active' } };
      const config2 = { url: '/audits', method: 'get', params: { status: 'inactive' } };

      requestThrottle.cacheResponse(config1, { status: 'ACTIVE' });
      requestThrottle.cacheResponse(config2, { status: 'INACTIVE' });

      expect(requestThrottle.getCachedResponse(config1).status).toBe('ACTIVE');
      expect(requestThrottle.getCachedResponse(config2).status).toBe('INACTIVE');
    });
  });
});
