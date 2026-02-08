// API Configuration
// This file centralizes all API URLs to avoid duplication

import Constants from 'expo-constants';
import axios from 'axios';
import {
  shouldThrottle,
  isPending,
  getCachedResponse,
  markPending,
  cacheResponse,
  getPendingPromise,
  getThrottleDelay
} from '../utils/requestThrottle';

/**
 * Get the API base URL based on environment
 * 
 * Configuration Options:
 * 1. app.json extra.apiUrl - For production builds
 * 2. Local IP for development - Auto-detected for physical devices
 * 
 * For physical devices in development: Use your computer's IP (e.g., 192.168.1.100)
 * For iOS Simulator: Use localhost
 * For Android Emulator: Use 10.0.2.2
 */
const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (!hostUri) return null;

  const withoutProtocol = String(hostUri).replace(/^[a-z]+:\/\//i, '');
  const hostAndPort = withoutProtocol.split('/')[0];
  return hostAndPort.split(':')[0] || null;
};

const getAutoDevApiUrl = () => {
  const host = getExpoHost();
  if (!host) {
    console.warn('Unable to detect Expo host, defaulting to localhost API.');
    return 'http://localhost:5000/api';
  }
  
  // Check if running in tunnel mode (exp.direct domain)
  // Tunnel URLs can't reach local backend, use production API instead
  if (host.includes('exp.direct') || host.includes('.exp.direct')) {
    console.log('[API] Tunnel mode detected, using production API');
    const appConfig = Constants.expoConfig?.extra?.apiUrl;
    if (appConfig?.production) {
      return appConfig.production;
    }
    // Fallback to Azure backend
    return 'https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api';
  }
  
  return `http://${host}:5000/api`;
};

const getApiBaseUrl = () => {
  // Check if we have configuration from app.json
  const appConfig = Constants.expoConfig?.extra?.apiUrl;
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL;
  
  if (envApiUrl) {
    return envApiUrl;
  }
  
  if (__DEV__) {
    // Development mode
    // Priority: env var > app.json config > auto-detected host
    if (appConfig?.development) {
      const devValue = String(appConfig.development).trim();
      if (['auto', 'local', 'lan'].includes(devValue.toLowerCase())) {
        return getAutoDevApiUrl();
      }
      return devValue;
    }
    return getAutoDevApiUrl();
  }
  
  // Production mode
  if (appConfig?.production) {
    return appConfig.production;
  }
  
  // Fallback - should be configured in app.json for production
  console.warn('Production API URL not configured in app.json');
  return 'https://your-production-api.com/api';
};

// API timeout settings - Optimized for faster response
export const API_TIMEOUT = __DEV__ ? 30000 : 20000; // 30s in dev, 20s in prod

// Retry settings for failed requests
export const RETRY_CONFIG = {
  maxRetries: 2, // Reduced from 3 for faster failures
  retryDelay: 500, // 500ms - faster retry
  retryOnStatusCodes: [408, 500, 502, 503, 504]
};

export const API_BASE_URL = getApiBaseUrl();

// Log the API URL being used (development only)
if (__DEV__) {
  console.log('[API] Using API URL:', API_BASE_URL);
}

// Configure axios defaults for better performance
axios.defaults.timeout = API_TIMEOUT;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor for request throttling and deduplication
axios.interceptors.request.use(
  async config => {
    config.metadata = { startTime: new Date() };
    
    // Only process GET requests for caching/throttling
    if (config.method && config.method.toLowerCase() === 'get') {
      if (config.__skipCache) {
        return config;
      }
      // Check for cached response first
      const cached = getCachedResponse(config);
      if (cached) {
        // Create a fake response that will be intercepted and returned
        config.__useCache = true;
        config.__cachedResponse = cached;
        return config;
      }
      
      // Check if same request is already pending (deduplication)
      if (isPending(config)) {
        const pendingPromise = getPendingPromise(config);
        if (pendingPromise) {
          // Wait for pending request and use its result
          try {
            await pendingPromise;
            const cachedAfter = getCachedResponse(config);
            if (cachedAfter) {
              config.__useCache = true;
              config.__cachedResponse = cachedAfter;
            }
          } catch (e) {
            // Pending request failed, continue with new request
          }
        }
      }
      
      // Check if request should be throttled - wait instead of rejecting
      if (shouldThrottle(config)) {
        const url = config.url || '';
        const throttleDelay = getThrottleDelay(url);
        if (__DEV__) {
          console.warn(`[API] Request throttled, waiting ${throttleDelay}ms: ${url}`);
        }
        // Wait for throttle delay before proceeding
        await new Promise(resolve => setTimeout(resolve, throttleDelay));
      }
    }
    
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor for performance tracking, caching, and retry logic
axios.interceptors.response.use(
  response => {
    // Check if we should use cached response instead
    if (response.config.__useCache && response.config.__cachedResponse) {
      return response.config.__cachedResponse;
    }
    
    const endTime = new Date();
    const duration = endTime - response.config.metadata?.startTime;
    if (__DEV__ && duration > 1000) {
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} took ${duration}ms`);
    }
    
    // Cache GET responses
    if (response.config.method && response.config.method.toLowerCase() === 'get' && !response.config.__skipCache) {
      cacheResponse(response.config, response);
    }
    
    return response;
  },
  async error => {
    // Check if we should use cached response on error
    if (error.config?.__useCache && error.config?.__cachedResponse) {
      return error.config.__cachedResponse;
    }
    
    const config = error.config || {};
    
    // Handle network errors (timeouts, connection issues)
    const isNetworkError = !error.response && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout'));
    
    // Handle 429 Too Many Requests - DO NOT RETRY to prevent cascading failures
    // When rate limited, reject immediately to prevent all requests from retrying simultaneously
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : null;
      
      // Try to use cached response if available
      if (config.method && config.method.toLowerCase() === 'get') {
        const cached = getCachedResponse(config);
        if (cached) {
          console.warn(`[API] Rate limited (429), using cached response: ${config.url}`);
          return cached;
        }
      }
      
      // Log the rate limit but don't retry - let the caller handle it
      if (waitTime) {
        console.warn(`[API] Rate limited (429), retry after ${waitTime}ms: ${config.url}`);
      } else {
        console.warn(`[API] Rate limited (429): ${config.url}`);
      }
      
      // Reject immediately - no retry to prevent cascading rate limit failures
      return Promise.reject(error);
    }
    
    // Handle 503 Service Unavailable with longer backoff
    if (error.response?.status === 503) {
      if (!config.__retryCount || config.__retryCount < 3) {
        config.__retryCount = (config.__retryCount || 0) + 1;
        // Longer backoff for 503 (server might be restarting)
        const waitTime = Math.min(10000, 2000 * Math.pow(2, config.__retryCount - 1)); // 2s, 4s, 8s
        console.warn(`[API] Service unavailable (503), retrying after ${waitTime}ms (attempt ${config.__retryCount}): ${config.url}`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return axios(config);
      }
      
      console.error(`[API] Service unavailable (503), max retries reached for: ${config.url}`);
      return Promise.reject(error);
    }
    
    // Handle network errors (timeouts) - retry with backoff
    if (isNetworkError) {
      if (!config.__retryCount || config.__retryCount < 2) {
        config.__retryCount = (config.__retryCount || 0) + 1;
        const waitTime = RETRY_CONFIG.retryDelay * Math.pow(2, config.__retryCount - 1);
        console.warn(`[API] Network error (timeout), retrying after ${waitTime}ms (attempt ${config.__retryCount}): ${config.url}`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return axios(config);
      }
      
      console.error(`[API] Network error (timeout), max retries reached for: ${config.url}`);
      return Promise.reject(error);
    }
    
    // Don't retry if no config or already retried max times
    if (!config || config.__retryCount >= RETRY_CONFIG.maxRetries) {
      return Promise.reject(error);
    }
    
    // Retry on other retryable status codes
    const status = error.response?.status;
    if (status && RETRY_CONFIG.retryOnStatusCodes.includes(status)) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      
      // Exponential backoff
      const waitTime = RETRY_CONFIG.retryDelay * Math.pow(2, config.__retryCount - 1);
      console.warn(`[API] Retrying after ${waitTime}ms (attempt ${config.__retryCount}) for status ${status}: ${config.url}`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return axios(config);
    }
    
    return Promise.reject(error);
  }
);

export default API_BASE_URL;
