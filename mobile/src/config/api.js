// API Configuration
// This file centralizes all API URLs to avoid duplication

import Constants from 'expo-constants';

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

// API timeout settings
export const API_TIMEOUT = __DEV__ ? 30000 : 15000; // 30s in dev, 15s in prod

// Retry settings for failed requests
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryOnStatusCodes: [408, 500, 502, 503, 504]
};

export const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;
