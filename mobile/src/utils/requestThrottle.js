/**
 * Request throttling utility to prevent rate limiting (429 errors)
 * Deduplicates and throttles API requests
 */

const pendingRequests = new Map();
const requestCache = new Map();
const lastRequestTime = new Map();

// Cache duration for different endpoints (in milliseconds)
// Increased to reduce API calls and prevent 429 errors
const CACHE_DURATIONS = {
  '/templates': 60000,           // 60 seconds (increased from 30s)
  '/scheduled-audits': 45000,   // 45 seconds (increased from 30s)
  '/notifications/unread-count': 30000, // 30 seconds (increased from 10s)
  '/notifications': 45000,      // 45 seconds (increased from 30s)
  '/analytics/dashboard': 120000, // 2 minutes (increased from 60s)
  '/locations': 600000,          // 10 minutes (increased from 5 min)
  '/users': 600000,             // 10 minutes (increased from 5 min)
  '/auth/me': 60000,            // 60 seconds - session check can be cached
  default: 45000,               // 45 seconds (increased from 30s)
};

// Minimum time between requests for the same endpoint (in milliseconds)
// Increased to reduce API calls and prevent 429 errors
const THROTTLE_DELAYS = {
  '/notifications/unread-count': 30000, // 30 seconds minimum (increased from 10s)
  '/notifications': 30000,      // 30 seconds minimum (increased from 15s)
  '/scheduled-audits': 30000,   // 30 seconds minimum (increased from 20s)
  '/templates': 30000,          // 30 seconds minimum (increased from 15s)
  '/auth/me': 30000,            // 30 seconds minimum - don't spam session checks
  default: 20000,               // 20 seconds minimum (increased from 10s)
};

/**
 * Get cache duration for an endpoint
 */
const getCacheDuration = (url) => {
  for (const [key, duration] of Object.entries(CACHE_DURATIONS)) {
    if (url.includes(key)) {
      return duration;
    }
  }
  return CACHE_DURATIONS.default;
};

/**
 * Get throttle delay for an endpoint
 */
export const getThrottleDelay = (url) => {
  for (const [key, delay] of Object.entries(THROTTLE_DELAYS)) {
    if (url.includes(key)) {
      return delay;
    }
  }
  return THROTTLE_DELAYS.default;
};

/**
 * Generate a cache key from request config
 */
const getCacheKey = (config) => {
  const url = config.url || '';
  const method = config.method || 'get';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${method.toUpperCase()}:${url}:${params}`;
};

/**
 * Check if request should be throttled
 */
export const shouldThrottle = (config) => {
  const url = config.url || '';
  const cacheKey = getCacheKey(config);
  const throttleDelay = getThrottleDelay(url);
  const lastTime = lastRequestTime.get(cacheKey);
  
  if (lastTime) {
    const timeSinceLastRequest = Date.now() - lastTime;
    if (timeSinceLastRequest < throttleDelay) {
      return true;
    }
  }
  
  return false;
};

/**
 * Check if request is already pending (deduplication)
 */
export const isPending = (config) => {
  const cacheKey = getCacheKey(config);
  return pendingRequests.has(cacheKey);
};

/**
 * Get cached response if available
 */
export const getCachedResponse = (config) => {
  const cacheKey = getCacheKey(config);
  const cached = requestCache.get(cacheKey);
  
  if (cached) {
    const cacheDuration = getCacheDuration(config.url || '');
    const age = Date.now() - cached.timestamp;
    
    if (age < cacheDuration) {
      return cached.response;
    } else {
      // Cache expired, remove it
      requestCache.delete(cacheKey);
    }
  }
  
  return null;
};

/**
 * Mark request as pending
 */
export const markPending = (config, promise) => {
  const cacheKey = getCacheKey(config);
  pendingRequests.set(cacheKey, promise);
  
  // Clean up after request completes
  promise.finally(() => {
    pendingRequests.delete(cacheKey);
    lastRequestTime.set(cacheKey, Date.now());
  });
  
  return promise;
};

/**
 * Cache response
 */
export const cacheResponse = (config, response) => {
  const cacheKey = getCacheKey(config);
  requestCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries periodically
  if (requestCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
      const cacheDuration = getCacheDuration(config.url || '');
      if (now - value.timestamp > cacheDuration * 2) {
        requestCache.delete(key);
      }
    }
  }
};

/**
 * Get pending promise for duplicate request
 */
export const getPendingPromise = (config) => {
  const cacheKey = getCacheKey(config);
  return pendingRequests.get(cacheKey);
};

/**
 * Clear cache for a specific endpoint
 */
export const clearCache = (urlPattern) => {
  for (const key of requestCache.keys()) {
    if (key.includes(urlPattern)) {
      requestCache.delete(key);
    }
  }
};

/**
 * Clear all caches
 */
export const clearAllCaches = () => {
  requestCache.clear();
  pendingRequests.clear();
  lastRequestTime.clear();
};

