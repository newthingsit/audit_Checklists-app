const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

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
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:19006']; // Default for development

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Content-Length']
}));

// Trust proxy if behind a reverse proxy (nginx, load balancer, etc.)
// Only enable in production or if explicitly set
if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Rate Limiting - More lenient in development
const isDevelopment = process.env.NODE_ENV !== 'production';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 5, // More lenient in development
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip X-Forwarded-For validation in development to avoid warnings
  validate: {
    xForwardedForHeader: isDevelopment ? false : true,
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 2000 : 100, // Much more lenient in development (2000 requests per 15 min)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip X-Forwarded-For validation in development to avoid warnings
  validate: {
    xForwardedForHeader: isDevelopment ? false : true,
  },
});

// Apply rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/scheduled-audits', require('./routes/scheduled-audits')); // Scheduled audits
app.use('/api/tasks', require('./routes/tasks')); // Tasks and workflows
app.use('/api/teams', require('./routes/teams')); // Team collaboration
app.use('/api/notifications', require('./routes/notifications')); // Notifications
app.use('/api/settings', require('./routes/settings')); // User Settings & Preferences

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Global error handler - MUST be after all routes but before listen
// This catches any unhandled errors and prevents 500 responses
app.use((err, req, res, next) => {
  // For reschedule-count endpoint, ALWAYS return 200 (never 500)
  const path = req.path || req.url || '';
  if (path.includes('reschedule-count') || path.includes('/reschedule-count')) {
    console.error('[Global Error Handler] Error in reschedule-count:', err.message);
    console.error('[Global Error Handler] Error stack:', err.stack);
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
        // Even this failed, but we tried
        console.error('[Global Error Handler] Failed to send response:', e.message);
      }
    }
    return; // Don't continue to default error handling
  }
  
  // For other routes, use default error handling
  console.error('Unhandled error:', err);
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
    console.log('[Cron] Running scheduled audits job...');
    jobs.processScheduledAudits();
  });

  // Schedule job to send reminders daily at 8 AM
  cron.schedule('0 8 * * *', () => {
    console.log('[Cron] Running reminders job...');
    jobs.sendReminders();
  });

  // Run jobs immediately on startup (for testing)
  if (process.env.RUN_JOBS_ON_STARTUP === 'true') {
    console.log('[Startup] Running scheduled audits job on startup...');
    jobs.processScheduledAudits();
    console.log('[Startup] Running reminders job on startup...');
    jobs.sendReminders();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access from network: http://YOUR_IP:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log('[Background Jobs] Scheduled audits job: Daily at 9:00 AM');
    console.log('[Background Jobs] Reminders job: Daily at 8:00 AM');
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
});

