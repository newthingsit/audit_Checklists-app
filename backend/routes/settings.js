const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const db = require('../config/database-loader');
const logger = require('../utils/logger');

// Helper to determine database type
const getDbType = () => {
  const dbType = (process.env.DB_TYPE || '').toLowerCase();
  if (dbType === 'mssql' || dbType === 'sqlserver' || process.env.MSSQL_SERVER) {
    return 'mssql';
  }
  return 'sqlite';
};

const getDb = () => db.getDb();

// ==================== USER PREFERENCES ====================
// NOTE: These routes MUST come before /:key to avoid being caught by the wildcard

// Get user preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const database = getDb();

    // Default preferences
    const defaultPreferences = {
      email_notifications_enabled: true,
      email_audit_completed: true,
      email_action_assigned: true,
      email_task_reminder: true,
      email_overdue_items: true,
      email_scheduled_audit: true,
      date_format: 'DD-MM-YYYY',
      items_per_page: 25,
      theme: 'light',
      dashboard_default_view: 'cards',
    };

    // Query user preferences from the column-based table
    const query = `SELECT * FROM user_preferences WHERE user_id = ?`;

    const userPrefs = await new Promise((resolve, reject) => {
      database.get(query, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // If user has preferences, merge them with defaults
    if (userPrefs) {
      Object.keys(defaultPreferences).forEach(key => {
        if (userPrefs[key] !== undefined && userPrefs[key] !== null) {
          // Convert 0/1 to boolean for boolean fields
          if (key.startsWith('email_')) {
            defaultPreferences[key] = userPrefs[key] === 1 || userPrefs[key] === true;
          } else {
            defaultPreferences[key] = userPrefs[key];
          }
        }
      });
    }

    res.json({ preferences: defaultPreferences });
  } catch (error) {
    logger.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user preferences
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;
    const database = getDb();
    const dbType = getDbType();

    // Valid columns in user_preferences table
    const validColumns = [
      'email_notifications_enabled', 'email_audit_completed', 'email_action_assigned',
      'email_task_reminder', 'email_overdue_items', 'email_scheduled_audit',
      'date_format', 'items_per_page', 'theme', 'dashboard_default_view'
    ];

    // Check if user preferences row exists
    const existing = await new Promise((resolve, reject) => {
      database.get('SELECT id FROM user_preferences WHERE user_id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Build update or insert query
    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(preferences)) {
      if (validColumns.includes(key)) {
        updateFields.push(`${key} = ?`);
        // Convert booleans to 1/0 for SQLite/MSSQL
        if (typeof value === 'boolean') {
          updateValues.push(value ? 1 : 0);
        } else {
          updateValues.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.json({ success: true, message: 'No valid preferences to update' });
    }

    if (existing) {
      // Update existing preferences
      const updatedAtField = dbType === 'mssql' ? 'updated_at = GETDATE()' : "updated_at = datetime('now')";
      updateFields.push(updatedAtField);
      updateValues.push(userId);

      const updateQuery = `UPDATE user_preferences SET ${updateFields.join(', ')} WHERE user_id = ?`;

      await new Promise((resolve, reject) => {
        database.run(updateQuery, updateValues, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      // Insert new preferences row
      const columns = ['user_id'];
      const placeholders = ['?'];
      const insertValues = [userId];

      for (const [key, value] of Object.entries(preferences)) {
        if (validColumns.includes(key)) {
          columns.push(key);
          placeholders.push('?');
          if (typeof value === 'boolean') {
            insertValues.push(value ? 1 : 0);
          } else {
            insertValues.push(value);
          }
        }
      }

      const insertQuery = `INSERT INTO user_preferences (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

      await new Promise((resolve, reject) => {
        database.run(insertQuery, insertValues, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    logger.info(`Preferences updated for user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ==================== FEATURE FLAGS ====================
// NOTE: These routes MUST come before /:key to avoid being caught by the wildcard

// Get feature flags (Public - used by mobile app)
router.get('/features/all', authenticate, async (req, res) => {
  try {
    const database = getDb();

    // Get all feature flags
    const query = `SELECT setting_key, setting_value FROM app_settings WHERE setting_key LIKE 'feature_%'`;

    const features = await new Promise((resolve, reject) => {
      database.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Default feature flags
    const defaultFeatures = {
      feature_biometric_auth: true,
      feature_push_notifications: true,
      feature_offline_mode: true,
      feature_gps_location: true,
      feature_digital_signature: true,
      feature_photo_capture: true,
    };

    // Merge with database values
    features.forEach(f => {
      const key = f.setting_key;
      try {
        defaultFeatures[key] = JSON.parse(f.setting_value);
      } catch {
        defaultFeatures[key] = f.setting_value === 'true';
      }
    });

    res.json({ features: defaultFeatures });
  } catch (error) {
    logger.error('Error fetching feature flags:', error);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

// Toggle a feature flag (Admin only)
router.post('/features/:feature/toggle', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { feature } = req.params;
    const { enabled } = req.body;
    const userId = req.user.id;
    const database = getDb();
    const dbType = getDbType();

    const key = feature.startsWith('feature_') ? feature : `feature_${feature}`;
    const value = enabled ? 'true' : 'false';

    // Upsert the feature flag
    const checkQuery = `SELECT id FROM app_settings WHERE setting_key = ?`;

    const existing = await new Promise((resolve, reject) => {
      database.get(checkQuery, [key], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      const updateQuery = dbType === 'mssql'
        ? `UPDATE app_settings SET setting_value = ?, updated_at = GETDATE(), updated_by = ? WHERE setting_key = ?`
        : `UPDATE app_settings SET setting_value = ?, updated_at = datetime('now'), updated_by = ? WHERE setting_key = ?`;

      await new Promise((resolve, reject) => {
        database.run(updateQuery, [value, userId, key], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      const insertQuery = dbType === 'mssql'
        ? `INSERT INTO app_settings (setting_key, setting_value, description, updated_at, updated_by) VALUES (?, ?, ?, GETDATE(), ?)`
        : `INSERT INTO app_settings (setting_key, setting_value, description, updated_at, updated_by) VALUES (?, ?, ?, datetime('now'), ?)`;

      await new Promise((resolve, reject) => {
        database.run(insertQuery, [key, value, `Feature flag for ${feature}`, userId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    logger.info(`Feature '${feature}' ${enabled ? 'enabled' : 'disabled'} by admin ${userId}`);
    res.json({ success: true, feature: key, enabled });
  } catch (error) {
    logger.error('Error toggling feature:', error);
    res.status(500).json({ error: 'Failed to toggle feature' });
  }
});

// ==================== APP SETTINGS (Admin Only) ====================

// Get all app settings
router.get('/', authenticate, async (req, res) => {
  try {
    const database = getDb();

    const query = `SELECT setting_key, setting_value, description, updated_at, updated_by FROM app_settings`;

    const settings = await new Promise((resolve, reject) => {
      database.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Convert to key-value object
    const settingsObj = {};
    settings.forEach(s => {
      try {
        settingsObj[s.setting_key] = JSON.parse(s.setting_value);
      } catch {
        settingsObj[s.setting_key] = s.setting_value;
      }
    });

    res.json({ settings: settingsObj });
  } catch (error) {
    logger.error('Error fetching app settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get a specific setting
router.get('/:key', authenticate, async (req, res) => {
  try {
    const { key } = req.params;
    const database = getDb();

    const query = `SELECT setting_value FROM app_settings WHERE setting_key = ?`;

    const setting = await new Promise((resolve, reject) => {
      database.get(query, [key], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    let value;
    try {
      value = JSON.parse(setting.setting_value);
    } catch {
      value = setting.setting_value;
    }

    res.json({ key, value });
  } catch (error) {
    logger.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update a setting (Admin only)
router.put('/:key', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const userId = req.user.id;
    const database = getDb();
    const dbType = getDbType();

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Check if setting exists
    const checkQuery = `SELECT id FROM app_settings WHERE setting_key = ?`;

    const existing = await new Promise((resolve, reject) => {
      database.get(checkQuery, [key], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      // Update existing setting
      const updateQuery = dbType === 'mssql'
        ? `UPDATE app_settings SET setting_value = ?, description = ?, updated_at = GETDATE(), updated_by = ? WHERE setting_key = ?`
        : `UPDATE app_settings SET setting_value = ?, description = ?, updated_at = datetime('now'), updated_by = ? WHERE setting_key = ?`;

      await new Promise((resolve, reject) => {
        database.run(updateQuery, [stringValue, description || '', userId, key], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      // Insert new setting
      const insertQuery = dbType === 'mssql'
        ? `INSERT INTO app_settings (setting_key, setting_value, description, updated_at, updated_by) VALUES (?, ?, ?, GETDATE(), ?)`
        : `INSERT INTO app_settings (setting_key, setting_value, description, updated_at, updated_by) VALUES (?, ?, ?, datetime('now'), ?)`;

      await new Promise((resolve, reject) => {
        database.run(insertQuery, [key, stringValue, description || '', userId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    logger.info(`Setting '${key}' updated by user ${userId}`);
    res.json({ success: true, key, value });
  } catch (error) {
    logger.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

module.exports = router;
