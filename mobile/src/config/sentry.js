/**
 * Sentry Configuration for React Native/Expo
 * Crash reporting and performance monitoring
 * 
 * Environment Variables:
 * - SENTRY_DSN: Your Sentry project DSN (required for production)
 * - SENTRY_ENVIRONMENT: Environment name (development, staging, production)
 * - SENTRY_ENABLED: Enable/disable Sentry (default: true in production, false in dev)
 */

import Constants from 'expo-constants';

// Safe Sentry import - falls back to no-ops if native module unavailable
let Sentry;
try {
  Sentry = require('@sentry/react-native');
} catch (e) {
  console.warn('[Sentry] Native module not available, using no-op fallback:', e?.message);
  // Provide no-op fallback so all exported functions work without crashing
  Sentry = {
    init: () => {},
    setUser: () => {},
    addBreadcrumb: () => {},
    captureException: () => {},
    captureMessage: () => {},
    startTransaction: () => ({ finish: () => {} }),
    wrap: (component) => component,
    ReactNativeTracing: class { constructor() {} },
    ReactNavigationInstrumentation: class { constructor() {} },
  };
}

// Get configuration from environment or expo config
const getConfig = () => {
  const expoConfig = Constants.expoConfig || {};
  const extra = expoConfig.extra || {};
  
  return {
    dsn: extra.sentryDsn || process.env.SENTRY_DSN || '',
    environment: extra.sentryEnvironment || process.env.SENTRY_ENVIRONMENT || (__DEV__ ? 'development' : 'production'),
    enabled: extra.sentryEnabled !== undefined 
      ? extra.sentryEnabled 
      : (process.env.SENTRY_ENABLED === 'true' || !__DEV__), // Enabled by default in production
    tracesSampleRate: extra.sentryTracesSampleRate || parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
    debug: __DEV__, // Enable debug in development
  };
};

/**
 * Initialize Sentry
 * Call this at app startup (before rendering)
 */
export const initSentry = () => {
  const config = getConfig();
  
  // Skip initialization if disabled or no DSN
  if (!config.enabled) {
    if (__DEV__) {
      console.log('📊 [Sentry] Disabled in development');
    }
    return;
  }
  
  if (!config.dsn) {
    if (__DEV__) {
      console.warn('⚠️ [Sentry] No DSN provided. Set SENTRY_DSN in app.json extra or environment.');
    }
    return;
  }
  
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    debug: config.debug,
    
    // Performance monitoring
    tracesSampleRate: config.tracesSampleRate, // 20% of transactions sampled by default
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000, // 30 seconds
    
    // Release tracking
    release: Constants.expoConfig?.version || '2.1.4',
    dist: Constants.expoConfig?.android?.versionCode?.toString() || 
          Constants.expoConfig?.ios?.buildNumber || 
          '1',
    
    // Integrations
    integrations: [
      new Sentry.ReactNativeTracing({
        routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
        tracingOrigins: ['localhost', /^\//, /^https:\/\//],
        
        // Track component render times
        enableUserInteractionTracing: true,
        
        // Track navigation performance
        enableNativeFramesTracking: true,
      }),
    ],
    
    // Before send hook - sanitize sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            // Remove potential passwords, tokens
            const sanitizedData = { ...breadcrumb.data };
            ['password', 'token', 'refreshToken', 'auth', 'authorization'].forEach(key => {
              if (sanitizedData[key]) {
                sanitizedData[key] = '[Filtered]';
              }
            });
            return { ...breadcrumb, data: sanitizedData };
          }
          return breadcrumb;
        });
      }
      
      // Remove sensitive data from request
      if (event.request && event.request.data) {
        const sanitizedData = { ...event.request.data };
        ['password', 'token', 'refreshToken'].forEach(key => {
          if (sanitizedData[key]) {
            sanitizedData[key] = '[Filtered]';
          }
        });
        event.request.data = sanitizedData;
      }
      
      return event;
    },
    
    // Ignore certain errors
    ignoreErrors: [
      // React Navigation errors that are handled gracefully
      'The action \'NAVIGATE\' with payload',
      // Network errors that are retried automatically
      'Network request failed',
      'Request aborted',
      'timeout',
      // Expected user cancellations
      'User cancelled',
      'Cancelled by user',
    ],
  });
  
  if (__DEV__) {
    console.log('📊 [Sentry] Initialized', {
      environment: config.environment,
      dsn: config.dsn.substring(0, 30) + '...',
      tracesSampleRate: config.tracesSampleRate,
    });
  }
};

/**
 * Set user context for error tracking
 */
export const setSentryUser = (user) => {
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  
  Sentry.setUser({
    id: user.id?.toString(),
    email: user.email,
    username: user.name,
    // Additional context
    role: user.role,
    permissions: user.permissions?.join(','),
  });
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addSentryBreadcrumb = (category, message, data = {}, level = 'info') => {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Capture exception manually
 */
export const captureSentryException = (error, context = {}) => {
  Sentry.captureException(error, {
    contexts: context,
    tags: {
      handled: 'true',
    },
  });
};

/**
 * Capture API error with correlation ID for distributed tracing
 * Links mobile errors to backend logs via correlation ID
 */
export const captureApiError = (error, correlationId, endpoint, method = 'GET') => {
  const status = error.response?.status || 'Network Error';
  const errorData = error.response?.data || {};
  
  Sentry.captureException(error, {
    tags: {
      api_error: 'true',
      correlation_id: correlationId,
      http_status: status.toString(),
      http_method: method.toUpperCase(),
      endpoint: endpoint,
    },
    contexts: {
      api: {
        correlation_id: correlationId,
        endpoint: endpoint,
        method: method.toUpperCase(),
        status: status,
        error_message: errorData.message || error.message,
        error_code: errorData.code || errorData.error,
      },
      response: {
        data: errorData,
        headers: error.response?.headers,
      },
    },
    fingerprint: [
      'api-error',
      endpoint,
      status.toString(),
    ],
  });
  
  // Add breadcrumb for request tracing
  addSentryBreadcrumb('api', `${method.toUpperCase()} ${endpoint} failed`, {
    correlation_id: correlationId,
    status,
    error: errorData.message || error.message,
  }, 'error');
};

/**
 * Capture message (non-error event)
 */
export const captureSentryMessage = (message, level = 'info', context = {}) => {
  Sentry.captureMessage(message, {
    level,
    contexts: context,
  });
};

/**
 * Start a transaction for performance monitoring
 */
export const startSentryTransaction = (name, op) => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

/**
 * Wrap navigation container for automatic screen tracking
 */
export const wrapNavigationContainer = (NavigationContainer) => {
  return Sentry.wrap(NavigationContainer);
};

export default Sentry;
