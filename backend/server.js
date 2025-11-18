const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
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

