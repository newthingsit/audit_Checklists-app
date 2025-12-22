// API Configuration
// This file centralizes all API URLs to avoid duplication

import Constants from 'expo-constants';
import axios from 'axios';

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
const getApiBaseUrl = () => {
  // Check if we have configuration from app.json
  const appConfig = Constants.expoConfig?.extra?.apiUrl;
  
  if (__DEV__) {
    // Development mode
    // Priority: app.json config > fallback to hardcoded IP
    if (appConfig?.development) {
      return appConfig.development;
    }
    // Fallback: Use production backend for Expo Go testing
    return 'https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api';
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

// Configure axios defaults for better performance
axios.defaults.timeout = API_TIMEOUT;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor for performance tracking
axios.interceptors.request.use(
  config => {
    config.metadata = { startTime: new Date() };
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor for performance tracking and retry logic
axios.interceptors.response.use(
  response => {
    const endTime = new Date();
    const duration = endTime - response.config.metadata?.startTime;
    if (__DEV__ && duration > 1000) {
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} took ${duration}ms`);
    }
    return response;
  },
  async error => {
    const config = error.config;
    
    // Don't retry if no config or already retried max times
    if (!config || config.__retryCount >= RETRY_CONFIG.maxRetries) {
      return Promise.reject(error);
    }
    
    // Only retry on specific status codes
    const status = error.response?.status;
    if (status && RETRY_CONFIG.retryOnStatusCodes.includes(status)) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay * config.__retryCount));
      
      return axios(config);
    }
    
    return Promise.reject(error);
  }
);

export default API_BASE_URL;
