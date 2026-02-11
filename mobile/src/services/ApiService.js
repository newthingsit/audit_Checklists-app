/**
 * Optimized API Service with caching and request deduplication
 * Improves app performance by reducing redundant network requests
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_TIMEOUT, RETRY_CONFIG } from '../config/api';

// In-memory cache for frequently accessed data
const memoryCache = new Map();
const pendingRequests = new Map();
const REFRESH_TOKEN_KEY = 'refresh_token';

let refreshPromise = null;
const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 15000 });
    const { token: newToken, refreshToken: newRefresh } = response.data || {};
    if (!newToken) return null;
    await SecureStore.setItemAsync('auth_token', newToken);
    if (newRefresh) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh);
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    return newToken;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
};

// Cache durations (in milliseconds)
// Note: Templates/checklists have short cache to ensure immediate reflection of changes
const CACHE_DURATIONS = {
  templates: 30 * 1000,          // 30 seconds (short cache for immediate updates)
  checklists: 30 * 1000,         // 30 seconds (short cache for immediate updates)
  locations: 5 * 60 * 1000,      // 5 minutes
  roles: 10 * 60 * 1000,         // 10 minutes
  user: 2 * 60 * 1000,           // 2 minutes
  analytics: 2 * 60 * 1000,      // 2 minutes
  audits: 1 * 60 * 1000,         // 1 minute
  default: 60 * 1000,            // 1 minute
};

// Create axios instance with optimized settings
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  },
});

// Request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    // Ensure Authorization is copied from global axios defaults
    const globalAuth = axios.defaults?.headers?.common?.Authorization;
    if (globalAuth && !config.headers?.Authorization) {
      config.headers = {
        ...config.headers,
        Authorization: globalAuth,
      };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Event emitter for auth events (logout on 401)
let authEventListener = null;

export const setAuthEventListener = (listener) => {
  authEventListener = listener;
};

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      if (!config?._retry && !config?.url?.includes('/auth/refresh') && !config?.url?.includes('/auth/login')) {
        config._retry = true;
        try {
          const newToken = await refreshAccessToken();
          if (newToken) {
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${newToken}`
            };
            return apiClient(config);
          }
        } catch (refreshError) {
          // fall through to auth error
        }
      }

      if (authEventListener) {
        authEventListener({ type: 'AUTH_ERROR', message: 'Session expired. Please login again.' });
      }
      return Promise.reject(error);
    }
    
    // Handle 403 Forbidden - permission issues
    if (error.response?.status === 403) {
      if (__DEV__) {
        console.warn('Permission denied:', config?.url);
      }
      return Promise.reject(error);
    }
    
    // Handle 400 Bad Request - don't retry (likely invalid credentials or bad request)
    if (error.response?.status === 400) {
      return Promise.reject(error);
    }
    
    // Handle 429 Too Many Requests - don't retry (rate limited)
    if (error.response?.status === 429) {
      if (__DEV__) {
        console.warn('Rate limited:', config?.url);
      }
      return Promise.reject(error);
    }
    
    // Retry logic for network errors and server errors (but not auth errors)
    if (
      !config._retry &&
      (config._retryCount || 0) < RETRY_CONFIG.maxRetries &&
      (RETRY_CONFIG.retryOnStatusCodes.includes(error.response?.status) || !error.response)
    ) {
      config._retry = true;
      config._retryCount = (config._retryCount || 0) + 1;
      
      // Exponential backoff
      const delay = RETRY_CONFIG.retryDelay * Math.pow(2, config._retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (__DEV__) {
        console.log(`Retrying request (attempt ${config._retryCount}):`, config.url);
      }
      
      return apiClient(config);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Get cache key for a request
 */
const getCacheKey = (endpoint, params = {}) => {
  const paramString = Object.keys(params).length 
    ? `?${new URLSearchParams(params).toString()}` 
    : '';
  return `api_cache_${endpoint}${paramString}`;
};

/**
 * Get cache duration for an endpoint
 */
const getCacheDuration = (endpoint) => {
  for (const [key, duration] of Object.entries(CACHE_DURATIONS)) {
    if (endpoint.includes(key)) {
      return duration;
    }
  }
  return CACHE_DURATIONS.default;
};

/**
 * Check if cached data is still valid
 */
const isCacheValid = (cachedData) => {
  if (!cachedData || !cachedData.timestamp) return false;
  return Date.now() - cachedData.timestamp < cachedData.duration;
};

/**
 * Get data from memory cache first, then AsyncStorage
 */
const getFromCache = async (cacheKey) => {
  // Check memory cache first (faster)
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey);
    if (isCacheValid(cached)) {
      return cached.data;
    }
    memoryCache.delete(cacheKey);
  }
  
  // Check AsyncStorage (persistent)
  try {
    const stored = await AsyncStorage.getItem(cacheKey);
    if (stored) {
      const cached = JSON.parse(stored);
      if (isCacheValid(cached)) {
        // Restore to memory cache
        memoryCache.set(cacheKey, cached);
        return cached.data;
      }
      // Clean up expired cache
      await AsyncStorage.removeItem(cacheKey);
    }
  } catch (error) {
    if (__DEV__) console.warn('Cache read error:', error);
  }
  
  return null;
};

/**
 * Save data to cache
 */
const saveToCache = async (cacheKey, data, duration) => {
  const cacheData = {
    data,
    timestamp: Date.now(),
    duration,
  };
  
  // Save to memory cache
  memoryCache.set(cacheKey, cacheData);
  
  // Save to AsyncStorage (persistent)
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    if (__DEV__) console.warn('Cache write error:', error);
  }
};

/**
 * Clear all API caches
 */
export const clearCache = async () => {
  memoryCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('api_cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    if (__DEV__) console.warn('Cache clear error:', error);
  }
};

/**
 * Clear cache for specific endpoint
 */
export const clearCacheFor = async (endpoint) => {
  const cacheKey = getCacheKey(endpoint);
  memoryCache.delete(cacheKey);
  try {
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    if (__DEV__) console.warn('Cache clear error:', error);
  }
};

/**
 * GET request with caching and request deduplication
 */
export const cachedGet = async (endpoint, params = {}, options = {}) => {
  const { 
    forceRefresh = false, 
    cacheDuration = getCacheDuration(endpoint) 
  } = options;
  
  const cacheKey = getCacheKey(endpoint, params);
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cachedData = await getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }
  
  // Check for pending request (deduplication)
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Make the request
  const requestPromise = (async () => {
    try {
      const response = await apiClient.get(endpoint, { params });
      await saveToCache(cacheKey, response.data, cacheDuration);
      return response.data;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();
  
  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

/**
 * POST request (clears related cache)
 */
export const post = async (endpoint, data = {}) => {
  const response = await apiClient.post(endpoint, data);
  // Clear related caches
  await clearCacheFor(endpoint.split('/')[0]);
  return response.data;
};

/**
 * PUT request (clears related cache)
 */
export const put = async (endpoint, data = {}) => {
  const response = await apiClient.put(endpoint, data);
  await clearCacheFor(endpoint.split('/')[0]);
  return response.data;
};

/**
 * DELETE request (clears related cache)
 */
export const del = async (endpoint) => {
  const response = await apiClient.delete(endpoint);
  await clearCacheFor(endpoint.split('/')[0]);
  return response.data;
};

/**
 * Standard GET request without caching
 */
export const get = async (endpoint, params = {}) => {
  const response = await apiClient.get(endpoint, { params });
  return response.data;
};

// Export the axios instance for direct use if needed
export { apiClient };

export default {
  get,
  cachedGet,
  post,
  put,
  del,
  clearCache,
  clearCacheFor,
};

