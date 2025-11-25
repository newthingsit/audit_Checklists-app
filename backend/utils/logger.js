/**
 * Logger utility for environment-aware logging
 * In production, sensitive data is not logged
 */

const isDev = process.env.NODE_ENV !== 'production';

// Sensitive patterns to filter out in production
const sensitivePatterns = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /email.*@/i,
  /credential/i
];

/**
 * Check if a message contains sensitive data
 */
const containsSensitiveData = (message) => {
  if (typeof message !== 'string') return false;
  return sensitivePatterns.some(pattern => pattern.test(message));
};

/**
 * Sanitize sensitive data from a message
 */
const sanitize = (message) => {
  if (typeof message !== 'string') return message;
  
  // Replace email addresses
  let sanitized = message.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');
  
  // Replace password mentions with context
  sanitized = sanitized.replace(/password[:\s]+\S+/gi, 'password: [REDACTED]');
  
  // Replace token values
  sanitized = sanitized.replace(/token[:\s]+\S+/gi, 'token: [REDACTED]');
  
  return sanitized;
};

const logger = {
  /**
   * Log info messages (always logged)
   */
  info: (...args) => {
    console.log('[INFO]', ...args);
  },

  /**
   * Log debug messages (development only)
   */
  debug: (...args) => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log warning messages (always logged, sanitized in production)
   */
  warn: (...args) => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    } else {
      const sanitizedArgs = args.map(arg => 
        typeof arg === 'string' ? sanitize(arg) : arg
      );
      console.warn('[WARN]', ...sanitizedArgs);
    }
  },

  /**
   * Log error messages (always logged, sanitized in production)
   */
  error: (...args) => {
    if (isDev) {
      console.error('[ERROR]', ...args);
    } else {
      const sanitizedArgs = args.map(arg => {
        if (arg instanceof Error) {
          return { message: sanitize(arg.message), stack: arg.stack };
        }
        return typeof arg === 'string' ? sanitize(arg) : arg;
      });
      console.error('[ERROR]', ...sanitizedArgs);
    }
  },

  /**
   * Log security-related events (always logged, always sanitized)
   */
  security: (event, details = {}) => {
    const sanitizedDetails = {};
    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'string' && containsSensitiveData(value)) {
        sanitizedDetails[key] = '[REDACTED]';
      } else {
        sanitizedDetails[key] = value;
      }
    }
    console.log('[SECURITY]', event, sanitizedDetails);
  },

  /**
   * Log audit events (for compliance)
   */
  audit: (action, userId, resourceType, resourceId, details = {}) => {
    console.log('[AUDIT]', {
      timestamp: new Date().toISOString(),
      action,
      userId,
      resourceType,
      resourceId,
      ...details
    });
  }
};

module.exports = logger;

