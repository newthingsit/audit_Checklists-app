const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const app = express();

const PORT = process.env.PORT || 5000;

// CORS Configuration - Include production domains by default
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:19006',
  'https://app.litebitefoods.com',
  'https://www.app.litebitefoods.com',
  'https://litebitefoods.com',
  'https://www.litebitefoods.com'
];

// Parse ALLOWED_ORIGINS from environment, trim whitespace, and merge with defaults
const envOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(o => o)
  : [];
  
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

// Log allowed origins in production for debugging
if (process.env.NODE_ENV === 'production') {
  logger.info('CORS allowed origins:', { allowedOrigins });
}

// CRITICAL: Add CORS headers to EVERY response FIRST (before any other middleware)
// This ensures CORS headers are present even when errors occur
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Normalize origin (remove trailing slashes, lowercase for comparison)
  const normalizedOrigin = origin ? origin.toLowerCase().replace(/\/$/, '') : null;
  const normalizedAllowedOrigins = allowedOrigins.map(o => o.toLowerCase().replace(/\/$/, ''));
  
  // Determine if origin is allowed:
  // 1. No origin (mobile apps, Postman, etc.) - always allow
  // 2. Origin is in the allowlist - always allow
  // 3. Development mode - allow all for easier testing
  const isAllowed = !origin || normalizedAllowedOrigins.includes(normalizedOrigin) || !isProduction;
  
  // ALWAYS set CORS headers for OPTIONS requests (preflight) so browser can see the response
  // For other requests, only set if allowed
  const shouldSetHeaders = req.method === 'OPTIONS' || isAllowed;
  
  if (shouldSetHeaders) {
    // Use specific origin when sending credentials; never send credentials with "*"
    let corsOrigin = '*';
    let allowCredentials = false;

    if (origin) {
      const originInList = normalizedAllowedOrigins.includes(normalizedOrigin);
      if (originInList) {
        // Use the original origin (not normalized) to preserve case
        corsOrigin = origin;
        allowCredentials = true;
      } else if (!isProduction) {
        // In development allow any origin, but still only allow credentials for explicit origin
        corsOrigin = origin;
        allowCredentials = true;
      } else {
        // Production and not in allowlist: use "*" but no credentials
        corsOrigin = '*';
        allowCredentials = false;
      }
    } else {
      // No origin (mobile/Postman): use "*" and no credentials
      corsOrigin = '*';
      allowCredentials = false;
    }

    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, X-Requested-With, Accept');
    if (allowCredentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Authorization');
  }
  
  // Handle preflight immediately - always return 204 for OPTIONS if headers are set
  if (req.method === 'OPTIONS') {
    if (shouldSetHeaders) {
      return res.status(204).end();
    } else {
      // If headers weren't set, still return 204 but log it
      logger.warn('OPTIONS request from disallowed origin:', { origin, allowedOrigins });
      return res.status(204).end();
    }
  }
  
  // For non-OPTIONS requests, only proceed if allowed
  if (!isAllowed && isProduction) {
    logger.security('cors_blocked', { origin, allowedOrigins, method: req.method, path: req.path });
    return res.status(403).json({ error: 'Not allowed by CORS policy' });
  }
  
  next();
});

// Response compression for better performance
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow images from external sources
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin requests
}));

// Standard CORS middleware as backup (handles edge cases)
// Note: First middleware handles CORS, this is a fallback for edge cases
app.use(cors({
  origin: (origin, callback) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const strictCORS = process.env.STRICT_CORS === 'true';
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, always allow
    if (!isProduction) return callback(null, true);
    
    // In production with strict mode, enforce allowlist
    if (strictCORS && !allowedOrigins.includes(origin)) {
      logger.security('cors_blocked', { origin, allowedOrigins });
      return callback(new Error('Not allowed by CORS policy'));
    }
    
    // In production without strict mode, allow but log
    if (!allowedOrigins.includes(origin)) {
      logger.security('cors_allowed_but_not_in_allowlist', { origin, allowedOrigins });
    }
    
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Content-Length'],
  maxAge: 86400, // Cache preflight requests for 24 hours
  optionsSuccessStatus: 204
}));

// Trust proxy if behind a reverse proxy (nginx, load balancer, etc.)
// Only enable in production or if explicitly set
if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Rate Limiting - More lenient in development
const isDevelopment = process.env.NODE_ENV !== 'production';

// Custom keyGenerator to handle Azure App Service IP addresses with ports
// Azure passes IP addresses like "180.151.76.170:55400" which express-rate-limit rejects
// Must use ipKeyGenerator helper for IPv6 support (required by express-rate-limit v7+)
const { ipKeyGenerator } = require('express-rate-limit');

const getClientIp = (req) => {
  // Try x-forwarded-for header first (Azure App Service)
  let ip = req.headers['x-forwarded-for'] || 
           req.headers['x-client-ip'] || 
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
  
  // Handle comma-separated list (x-forwarded-for can have multiple IPs)
  if (typeof ip === 'string' && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  
  // Remove port number if present (Azure App Service includes port)
  // Format: "180.151.76.170:55400" -> "180.151.76.170"
  if (typeof ip === 'string' && ip.includes(':')) {
    // Check if it's IPv6 format [::1]:port or IPv4 format 1.2.3.4:port
    if (ip.startsWith('[')) {
      // IPv6: [::1]:port -> extract [::1]
      const match = ip.match(/^\[([^\]]+)\]/);
      ip = match ? match[1] : ip.split(']')[0].substring(1);
    } else {
      // IPv4: 1.2.3.4:port -> extract 1.2.3.4
      ip = ip.split(':')[0];
    }
  }
  
  // Validate IP format (basic check)
  if (ip === 'unknown' || (!ip.match(/^[\d.]+$/) && !ip.match(/^[0-9a-fA-F:]+$/))) {
    // Fallback to a default key if IP is invalid
    return req.headers['user-agent'] || 'unknown-client';
  }
  
  return ip;
};

// Use ipKeyGenerator helper to properly handle IPv6 addresses
// This wraps our custom getClientIp function to satisfy express-rate-limit's IPv6 requirements
// ipKeyGenerator applies subnet masking to IPv6 addresses (default /56) to prevent bypass
const getClientIpKeyGenerator = (req) => {
  const ip = getClientIp(req);
  // If IP is invalid/unknown, return the fallback key
  if (ip === 'unknown' || ip === (req.headers['user-agent'] || 'unknown-client')) {
    return ip;
  }
  // Use ipKeyGenerator helper for proper IPv6 subnet masking (prevents IPv6 bypass)
  // For IPv4, it returns the IP unchanged; for IPv6, it applies /56 subnet mask
  return ipKeyGenerator(ip, 56);
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 5, // More lenient in development
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIpKeyGenerator, // Use custom IP extractor with IPv6 support
  // Skip X-Forwarded-For validation in development to avoid warnings
  validate: {
    xForwardedForHeader: isDevelopment ? false : true,
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 2000 : 500, // Increased to 500 for production (mobile apps need more requests)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIpKeyGenerator, // Use custom IP extractor with IPv6 support
  // Skip X-Forwarded-For validation in development to avoid warnings
  validate: {
    xForwardedForHeader: isDevelopment ? false : true,
  },
});

// Stricter rate limiter for sensitive operations
const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 100 : 50, // Increased to 50 attempts per hour in production
  message: 'Too many attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIpKeyGenerator, // Use custom IP extractor with IPv6 support
  validate: {
    xForwardedForHeader: isDevelopment ? false : true,
  },
});

// File upload rate limiter - Significantly increased for large audits (174+ items)
// Mobile apps need to upload many photos quickly during audits
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 500 : 500, // Increased to 500 uploads per 15 min for large audits (was 100)
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIpKeyGenerator, // Use custom IP extractor with IPv6 support
  validate: {
    xForwardedForHeader: isDevelopment ? false : true,
  },
  // Skip rate limiting for uploads if user is authenticated (trust authenticated users more)
  skip: (req) => {
    // Allow more uploads for authenticated users (they're doing legitimate audits)
    return false; // Still rate limit, but with higher limit above
  }
});

// Audit operations rate limiter (more lenient - mobile apps make many requests per audit)
const auditLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 2000 : 1000, // 1000 requests per 15 min for audit operations
  message: 'Too many audit requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIpKeyGenerator, // Use custom IP extractor with IPv6 support
  validate: {
    xForwardedForHeader: isDevelopment ? false : true,
  },
});

// Apply rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Apply stricter limits to sensitive operations
app.use('/api/users', sensitiveOpLimiter); // User management
app.use('/api/roles', sensitiveOpLimiter); // Role management

// Apply upload limiter to file upload routes
app.use('/api/upload', uploadLimiter);

// Apply more lenient rate limiting to audit routes (mobile apps need more requests)
app.use('/api/audits', auditLimiter);

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Body parsing middleware - Increased limits for large templates
app.use(express.json({ limit: '50mb' })); // Increased from 10mb for large templates
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Increased from 10mb

// Serve uploaded files statically with caching headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Set cache control based on file type
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for images
    }
  }
}));

// Caching middleware for semi-static API data
const cacheControl = (maxAge) => (req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  }
  next();
};

// Apply caching to read-only endpoints
// Note: Checklists/templates cache reduced to 30 seconds since they're frequently updated
app.use('/api/checklists', cacheControl(30)); // 30 sec cache for checklists
app.use('/api/templates', cacheControl(30)); // 30 sec cache for templates
// Roles should not be cached since they're editable and changes should be immediate
// app.use('/api/roles', cacheControl(600));
app.use('/api/locations', cacheControl(300)); // 5 min cache for locations
app.use('/api/analytics', cacheControl(120)); // 2 min cache for analytics (balance freshness vs performance)

// Database - automatically selects SQLite, PostgreSQL, or MySQL based on environment
const db = require('./config/database-loader');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users')); // User management (admin only)
app.use('/api/roles', require('./routes/roles')); // Role management (admin only)
app.use('/api/checklists', require('./routes/checklists'));
app.use('/api/audits', require('./routes/audits'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api', require('./routes/upload')); // File uploads
app.use('/api/reports', require('./routes/reports')); // Reports and exports
app.use('/api/analytics', require('./routes/analytics')); // Analytics
app.use('/api/actions', require('./routes/actions')); // Action plans and corrective actions
app.use('/api/locations', require('./routes/locations')); // Location management
app.use('/api/store-groups', require('./routes/store-groups')); // Store groups/regions
app.use('/api/scheduled-audits', require('./routes/scheduled-audits')); // Scheduled audits
app.use('/api/tasks', require('./routes/tasks')); // Tasks and workflows
app.use('/api/teams', require('./routes/teams')); // Team collaboration
app.use('/api/notifications', require('./routes/notifications')); // Notifications
app.use('/api/settings', require('./routes/settings')); // User Settings & Preferences

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Warmup endpoint - tests database connection (useful for Azure cold starts)
app.get('/api/warmup', async (req, res) => {
  try {
    const dbInstance = db.getDb();
    // Simple query to test database connection
    dbInstance.get('SELECT 1 as test', [], (err, result) => {
      if (err) {
        logger.error('Warmup database test failed:', err.message);
        return res.status(503).json({ 
          status: 'ERROR', 
          message: 'Database connection failed',
          error: err.message 
        });
      }
      res.json({ 
        status: 'OK', 
        message: 'Server and database are ready',
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    logger.error('Warmup endpoint error:', error.message);
    res.status(503).json({ 
      status: 'ERROR', 
      message: 'Service unavailable',
      error: error.message 
    });
  }
});

// Global error handler - MUST be after all routes but before listen
// This catches any unhandled errors and prevents 500 responses
app.use((err, req, res, next) => {
  // CORS headers should already be set by the first middleware
  // But ensure they're present on error responses too
  const origin = req.headers.origin;
  if (origin && !res.getHeader('Access-Control-Allow-Origin')) {
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, X-Requested-With');
    }
  }
  
  // For reschedule-count endpoint, ALWAYS return 200 (never 500)
  const reqPath = req.path || req.url || '';
  if (reqPath.includes('reschedule-count') || reqPath.includes('/reschedule-count')) {
    logger.error('Error in reschedule-count:', err.message);
    if (!res.headersSent) {
      try {
        return res.status(200).json({ 
          // Original web keys
          rescheduleCount: 0,
          limit: 2,
          remainingReschedules: 2,
          // Mobile-friendly keys
          count: 0,
          remaining: 2
        });
      } catch (e) {
        logger.error('Failed to send reschedule-count response:', e.message);
      }
    }
    return; // Don't continue to default error handling
  }
  
  // For other routes, use default error handling
  logger.error('Unhandled request error:', { path: reqPath, method: req.method, error: err.message });
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database and start server
db.init().then(() => {
  // Initialize background jobs after database is ready
  const jobs = require('./jobs/scheduled-audits');
  const cron = require('node-cron');

  // Schedule job to process scheduled audits daily at 9 AM
  cron.schedule('0 9 * * *', () => {
    logger.info('[Cron] Running scheduled audits job...');
    jobs.processScheduledAudits();
  });

  // Schedule job to send reminders daily at 8 AM
  cron.schedule('0 8 * * *', () => {
    logger.info('[Cron] Running reminders job...');
    jobs.sendReminders();
  });

  // Run jobs immediately on startup (for testing)
  if (process.env.RUN_JOBS_ON_STARTUP === 'true') {
    logger.info('[Startup] Running scheduled audits job on startup...');
    jobs.processScheduledAudits();
    logger.info('[Startup] Running reminders job on startup...');
    jobs.sendReminders();
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Access from network: http://YOUR_IP:${PORT}`);
    logger.info(`Local access: http://localhost:${PORT}`);
    logger.info('[Background Jobs] Scheduled audits job: Daily at 9:00 AM');
    logger.info('[Background Jobs] Reminders job: Daily at 8:00 AM');
  });
}).catch(err => {
  logger.error('Database initialization failed:', err);
  process.exit(1);
});
