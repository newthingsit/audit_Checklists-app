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

    let userPrefs = null;
    try {
      userPrefs = await new Promise((resolve, reject) => {
        database.get(query, [userId], (err, row) => {
          if (err) {
            // If table doesn't exist or other error, just return null (use defaults)
            logger.warn('Error fetching user preferences (using defaults):', err.message);
            resolve(null);
          } else {
            resolve(row);
          }
        });
      });
    } catch (error) {
      // If query fails completely, just use defaults
      logger.warn('Error in preferences query (using defaults):', error.message);
      userPrefs = null;
    }

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

// ==================== SEED RGR CHECKLIST ====================
// Admin-only endpoint to create the RGR checklist template
router.post('/seed-rgr-checklist', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const database = getDb();
    const userId = req.user.id;

    // Check if RGR checklist already exists
    const existingResult = await new Promise((resolve, reject) => {
      database.get(
        "SELECT id FROM checklist_templates WHERE name LIKE '%RGR%'",
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingResult) {
      return res.json({ 
        success: false, 
        message: 'RGR checklist already exists',
        templateId: existingResult.id
      });
    }

    // RGR Checklist definition
    const RGR_CHECKLIST = {
      name: 'RGR - Restaurant General Review',
      category: 'General',
      description: 'Quick photo-based general restaurant review. Select store, take photos for each area, and save.',
      items: [
        {
          title: 'Front Entrance',
          description: 'Take photo of the front entrance area - check cleanliness and signage',
          category: 'Exterior',
          required: true,
          order_index: 0,
          options: [
            { option_text: 'Good', mark: '3', order_index: 0 },
            { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
            { option_text: 'Poor', mark: '0', order_index: 2 },
            { option_text: 'N/A', mark: 'NA', order_index: 3 }
          ]
        },
        {
          title: 'Dining Area',
          description: 'Take photo of the dining area - check tables, chairs, floor cleanliness',
          category: 'Interior',
          required: true,
          order_index: 1,
          options: [
            { option_text: 'Good', mark: '3', order_index: 0 },
            { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
            { option_text: 'Poor', mark: '0', order_index: 2 },
            { option_text: 'N/A', mark: 'NA', order_index: 3 }
          ]
        },
        {
          title: 'Counter/Service Area',
          description: 'Take photo of the counter/service area - check organization and cleanliness',
          category: 'Interior',
          required: true,
          order_index: 2,
          options: [
            { option_text: 'Good', mark: '3', order_index: 0 },
            { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
            { option_text: 'Poor', mark: '0', order_index: 2 },
            { option_text: 'N/A', mark: 'NA', order_index: 3 }
          ]
        },
        {
          title: 'Kitchen Area',
          description: 'Take photo of the kitchen - check equipment, cleanliness, organization',
          category: 'Kitchen',
          required: true,
          order_index: 3,
          options: [
            { option_text: 'Good', mark: '3', order_index: 0 },
            { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
            { option_text: 'Poor', mark: '0', order_index: 2 },
            { option_text: 'N/A', mark: 'NA', order_index: 3 }
          ]
        },
        {
          title: 'Storage Area',
          description: 'Take photo of storage area - check proper storage, labeling, organization',
          category: 'Kitchen',
          required: true,
          order_index: 4,
          options: [
            { option_text: 'Good', mark: '3', order_index: 0 },
            { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
            { option_text: 'Poor', mark: '0', order_index: 2 },
            { option_text: 'N/A', mark: 'NA', order_index: 3 }
          ]
        },
        {
          title: 'Restroom',
          description: 'Take photo of restroom - check cleanliness and supplies',
          category: 'Facilities',
          required: true,
          order_index: 5,
          options: [
            { option_text: 'Good', mark: '3', order_index: 0 },
            { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
            { option_text: 'Poor', mark: '0', order_index: 2 },
            { option_text: 'N/A', mark: 'NA', order_index: 3 }
          ]
        },
        {
          title: 'Staff Appearance',
          description: 'Take photo of staff - check uniforms, name tags, hygiene',
          category: 'Staff',
          required: false,
          order_index: 6,
          options: [
            { option_text: 'Good', mark: '3', order_index: 0 },
            { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
            { option_text: 'Poor', mark: '0', order_index: 2 },
            { option_text: 'N/A', mark: 'NA', order_index: 3 }
          ]
        },
        {
          title: 'Menu Display',
          description: 'Take photo of menu display - check visibility, pricing, condition',
          category: 'Interior',
          required: false,
          order_index: 7,
          options: [
            { option_text: 'Good', mark: '3', order_index: 0 },
            { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
            { option_text: 'Poor', mark: '0', order_index: 2 },
            { option_text: 'N/A', mark: 'NA', order_index: 3 }
          ]
        }
      ]
    };

    // Create template
    const templateResult = await new Promise((resolve, reject) => {
      database.run(
        'INSERT INTO checklist_templates (name, category, description, created_by, ui_version, allow_photo) VALUES (?, ?, ?, ?, ?, ?)',
        [RGR_CHECKLIST.name, RGR_CHECKLIST.category, RGR_CHECKLIST.description, userId, 2, 1],
        function(err, result) {
          if (err) reject(err);
          else resolve({ lastID: result?.lastID || this?.lastID });
        }
      );
    });

    const templateId = templateResult.lastID;

    // Create items
    for (const item of RGR_CHECKLIST.items) {
      const itemResult = await new Promise((resolve, reject) => {
        database.run(
          'INSERT INTO checklist_items (template_id, title, description, category, required, order_index) VALUES (?, ?, ?, ?, ?, ?)',
          [templateId, item.title, item.description, item.category, item.required ? 1 : 0, item.order_index],
          function(err, result) {
            if (err) reject(err);
            else resolve({ lastID: result?.lastID || this?.lastID });
          }
        );
      });

      const itemId = itemResult.lastID;

      // Create options for this item
      for (const option of item.options) {
        await new Promise((resolve, reject) => {
          database.run(
            'INSERT INTO checklist_item_options (item_id, option_text, mark, order_index) VALUES (?, ?, ?, ?)',
            [itemId, option.option_text, option.mark, option.order_index],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }

    logger.info(`RGR checklist created by user ${userId}, template ID: ${templateId}`);
    
    res.json({ 
      success: true, 
      message: 'RGR checklist created successfully',
      templateId: templateId,
      itemsCount: RGR_CHECKLIST.items.length
    });
  } catch (error) {
    logger.error('Error creating RGR checklist:', error);
    res.status(500).json({ error: 'Failed to create RGR checklist', details: error.message });
  }
});

module.exports = router;
