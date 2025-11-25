const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get user preferences
// Allow unauthenticated requests to return defaults (for theme loading, etc.)
router.get('/preferences', (req, res) => {
  // Try to authenticate, but don't fail if token is missing
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    // No token - return defaults
    const defaults = {
      email_notifications_enabled: true,
      email_audit_completed: true,
      email_action_assigned: true,
      email_task_reminder: true,
      email_overdue_items: true,
      email_scheduled_audit: true,
      date_format: 'DD-MM-YYYY',
      items_per_page: 25,
      theme: 'light',
      dashboard_default_view: 'cards'
    };
    return res.json({ preferences: defaults });
  }

  // Try to verify token, but don't fail if invalid
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-DEVELOPMENT-ONLY';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    // Token invalid - return defaults instead of error
    const defaults = {
      email_notifications_enabled: true,
      email_audit_completed: true,
      email_action_assigned: true,
      email_task_reminder: true,
      email_overdue_items: true,
      email_scheduled_audit: true,
      date_format: 'DD-MM-YYYY',
      items_per_page: 25,
      theme: 'light',
      dashboard_default_view: 'cards'
    };
    return res.json({ preferences: defaults });
  }

  // Check if user is authenticated
  if (!req.user || !req.user.id) {
    // Return defaults for unauthenticated requests (e.g., during theme loading)
    const defaults = {
      email_notifications_enabled: true,
      email_audit_completed: true,
      email_action_assigned: true,
      email_task_reminder: true,
      email_overdue_items: true,
      email_scheduled_audit: true,
      date_format: 'DD-MM-YYYY',
      items_per_page: 25,
      theme: 'light',
      dashboard_default_view: 'cards'
    };
    return res.json({ preferences: defaults });
  }
  
  const userId = req.user.id;
  const dbInstance = db.getDb();

  dbInstance.get(
    'SELECT * FROM user_preferences WHERE user_id = ?',
    [userId],
    (err, preferences) => {
      if (err) {
        console.error('Error fetching preferences:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      // If no preferences exist, return defaults
      if (!preferences) {
        const defaults = {
          email_notifications_enabled: true,
          email_audit_completed: true,
          email_action_assigned: true,
          email_task_reminder: true,
          email_overdue_items: true,
          email_scheduled_audit: true,
          date_format: 'DD-MM-YYYY',
          items_per_page: 25,
          theme: 'light',
          dashboard_default_view: 'cards'
        };
        return res.json({ preferences: defaults });
      }

      // Convert boolean values (SQLite returns 0/1) and ensure items_per_page is a number
      const prefs = {
        ...preferences,
        email_notifications_enabled: Boolean(preferences.email_notifications_enabled),
        email_audit_completed: Boolean(preferences.email_audit_completed),
        email_action_assigned: Boolean(preferences.email_action_assigned),
        email_task_reminder: Boolean(preferences.email_task_reminder),
        email_overdue_items: Boolean(preferences.email_overdue_items),
        email_scheduled_audit: Boolean(preferences.email_scheduled_audit),
        items_per_page: preferences.items_per_page ? (typeof preferences.items_per_page === 'string' ? parseInt(preferences.items_per_page, 10) : preferences.items_per_page) : 25
      };

      res.json({ preferences: prefs });
    }
  );
});

// Update user preferences
router.put('/preferences', authenticate, (req, res) => {
  const userId = req.user.id;
  const dbInstance = db.getDb();
  
  // Support both direct fields and nested preferences object
  const preferences = req.body.preferences || req.body;
  const {
    email_notifications_enabled,
    email_audit_completed,
    email_action_assigned,
    email_task_reminder,
    email_overdue_items,
    email_scheduled_audit,
    date_format,
    items_per_page,
    theme,
    dashboard_default_view
  } = preferences;

  // Validate date format
  const validDateFormats = ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'];
  if (date_format && !validDateFormats.includes(date_format)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  // Validate items per page (convert to number if string)
  const itemsPerPageNum = items_per_page !== undefined ? (typeof items_per_page === 'string' ? parseInt(items_per_page, 10) : items_per_page) : undefined;
  if (itemsPerPageNum !== undefined && (isNaN(itemsPerPageNum) || itemsPerPageNum < 10 || itemsPerPageNum > 100)) {
    return res.status(400).json({ error: 'Items per page must be between 10 and 100' });
  }

  // Validate theme
  const validThemes = ['light', 'dark', 'auto'];
  if (theme && !validThemes.includes(theme)) {
    return res.status(400).json({ error: 'Invalid theme' });
  }

  // Check if preferences exist
  dbInstance.get(
    'SELECT id FROM user_preferences WHERE user_id = ?',
    [userId],
    (err, existing) => {
      if (err) {
        console.error('Error checking preferences:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      const dbType = process.env.DB_TYPE || 'sqlite';
      const now = dbType === 'mssql' || dbType === 'sqlserver'
        ? 'GETDATE()'
        : dbType === 'mysql'
        ? 'NOW()'
        : "datetime('now')";

      if (existing) {
        // Update existing preferences
        const updates = [];
        const params = [];

        if (email_notifications_enabled !== undefined) {
          updates.push('email_notifications_enabled = ?');
          params.push(email_notifications_enabled ? 1 : 0);
        }
        if (email_audit_completed !== undefined) {
          updates.push('email_audit_completed = ?');
          params.push(email_audit_completed ? 1 : 0);
        }
        if (email_action_assigned !== undefined) {
          updates.push('email_action_assigned = ?');
          params.push(email_action_assigned ? 1 : 0);
        }
        if (email_task_reminder !== undefined) {
          updates.push('email_task_reminder = ?');
          params.push(email_task_reminder ? 1 : 0);
        }
        if (email_overdue_items !== undefined) {
          updates.push('email_overdue_items = ?');
          params.push(email_overdue_items ? 1 : 0);
        }
        if (email_scheduled_audit !== undefined) {
          updates.push('email_scheduled_audit = ?');
          params.push(email_scheduled_audit ? 1 : 0);
        }
        if (date_format !== undefined) {
          updates.push('date_format = ?');
          params.push(date_format);
        }
        if (itemsPerPageNum !== undefined) {
          updates.push('items_per_page = ?');
          params.push(itemsPerPageNum);
        }
        if (theme !== undefined) {
          updates.push('theme = ?');
          params.push(theme);
        }
        if (dashboard_default_view !== undefined) {
          updates.push('dashboard_default_view = ?');
          params.push(dashboard_default_view);
        }

        if (updates.length === 0) {
          return res.status(400).json({ error: 'No preferences to update' });
        }

        updates.push(`updated_at = ${now}`);
        params.push(userId);

        dbInstance.run(
          `UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = ?`,
          params,
          function(updateErr) {
            if (updateErr) {
              console.error('Error updating preferences:', updateErr);
              return res.status(500).json({ error: 'Database error', details: updateErr.message });
            }
            res.json({ message: 'Preferences updated successfully' });
          }
        );
      } else {
        // Create new preferences
        dbInstance.run(
          `INSERT INTO user_preferences (
            user_id, email_notifications_enabled, email_audit_completed,
            email_action_assigned, email_task_reminder, email_overdue_items,
            email_scheduled_audit, date_format, items_per_page, theme, dashboard_default_view
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            email_notifications_enabled !== undefined ? (email_notifications_enabled ? 1 : 0) : 1,
            email_audit_completed !== undefined ? (email_audit_completed ? 1 : 0) : 1,
            email_action_assigned !== undefined ? (email_action_assigned ? 1 : 0) : 1,
            email_task_reminder !== undefined ? (email_task_reminder ? 1 : 0) : 1,
            email_overdue_items !== undefined ? (email_overdue_items ? 1 : 0) : 1,
            email_scheduled_audit !== undefined ? (email_scheduled_audit ? 1 : 0) : 1,
            date_format || 'DD-MM-YYYY',
            itemsPerPageNum !== undefined ? itemsPerPageNum : 25,
            theme || 'light',
            dashboard_default_view || 'cards'
          ],
          function(insertErr) {
            if (insertErr) {
              console.error('Error creating preferences:', insertErr);
              return res.status(500).json({ error: 'Database error', details: insertErr.message });
            }
            res.json({ message: 'Preferences created successfully' });
          }
        );
      }
    }
  );
});

module.exports = router;

