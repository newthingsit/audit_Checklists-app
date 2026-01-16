const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const logger = require('../utils/logger');

const router = express.Router();

// Get all assignment rules
router.get('/', authenticate, requirePermission('manage_templates'), (req, res) => {
  const dbInstance = db.getDb();
  const { template_id } = req.query;
  
  // Build query to get rules (optionally filtered by template)
  let query = `
    SELECT ar.*, ct.name as template_name
    FROM assignment_rules ar
    LEFT JOIN checklist_templates ct ON ar.template_id = ct.id
    WHERE ar.is_active = 1
  `;
  const params = [];
  
  if (template_id) {
    query += ` AND (ar.template_id = ? OR ar.template_id IS NULL)`;
    params.push(parseInt(template_id, 10));
  }
  
  query += ` ORDER BY ar.priority_level DESC, ar.category ASC`;
  
  dbInstance.all(query, params, (err, rules) => {
    if (err) {
      logger.error('Error fetching assignment rules:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    // Convert to category-to-role mapping for backward compatibility
    const categoryRules = {};
    (rules || []).forEach(rule => {
      // If template-specific rule exists, it takes precedence
      if (!categoryRules[rule.category] || rule.template_id) {
        categoryRules[rule.category] = rule.assigned_role;
      }
    });
    
    // Get escalation settings from app_settings or environment
    dbInstance.get(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'escalation_days'`,
      [],
      (err, setting) => {
        const escalationDays = setting 
          ? parseInt(setting.setting_value, 10) 
          : parseInt(process.env.ESCALATION_DAYS || '3', 10);
        
        res.json({
          rules: rules || [],
          categoryRules,
          escalationDays,
          defaultRole: 'manager' // Default role for unassigned items
        });
      }
    );
  });
});

// Create a new assignment rule
router.post('/', authenticate, requirePermission('manage_templates'), (req, res) => {
  const { category, assigned_role, template_id, priority_level } = req.body;
  const dbInstance = db.getDb();
  
  if (!category || !assigned_role) {
    return res.status(400).json({ error: 'Category and assigned_role are required' });
  }
  
  // Check if rule already exists for this category (and template if specified)
  const checkQuery = template_id 
    ? `SELECT id FROM assignment_rules WHERE category = ? AND template_id = ?`
    : `SELECT id FROM assignment_rules WHERE category = ? AND template_id IS NULL`;
  
  const checkParams = template_id ? [category.toUpperCase(), template_id] : [category.toUpperCase()];
  
  dbInstance.get(checkQuery, checkParams, (err, existing) => {
    if (err) {
      logger.error('Error checking existing rule:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (existing) {
      return res.status(400).json({ error: 'Assignment rule already exists for this category' });
    }
    
    // Insert new rule
    dbInstance.run(
      `INSERT INTO assignment_rules (category, assigned_role, template_id, priority_level, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [category.toUpperCase(), assigned_role, template_id || null, priority_level || 0],
      function(insertErr) {
        if (insertErr) {
          logger.error('Error creating assignment rule:', insertErr);
          return res.status(500).json({ error: 'Database error', details: insertErr.message });
        }
        
        res.status(201).json({
          id: this.lastID,
          message: 'Assignment rule created successfully'
        });
      }
    );
  });
});

// Update an assignment rule
router.put('/:id', authenticate, requirePermission('manage_templates'), (req, res) => {
  const { id } = req.params;
  const { category, assigned_role, template_id, priority_level, is_active } = req.body;
  const dbInstance = db.getDb();
  
  if (!category || !assigned_role) {
    return res.status(400).json({ error: 'Category and assigned_role are required' });
  }
  
  dbInstance.run(
    `UPDATE assignment_rules 
     SET category = ?, assigned_role = ?, template_id = ?, priority_level = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [category.toUpperCase(), assigned_role, template_id || null, priority_level || 0, is_active !== undefined ? is_active : 1, id],
    function(err) {
      if (err) {
        logger.error('Error updating assignment rule:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Assignment rule not found' });
      }
      
      res.json({ message: 'Assignment rule updated successfully' });
    }
  );
});

// Delete an assignment rule
router.delete('/:id', authenticate, requirePermission('manage_templates'), (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();
  
  dbInstance.run(
    `DELETE FROM assignment_rules WHERE id = ?`,
    [id],
    function(err) {
      if (err) {
        logger.error('Error deleting assignment rule:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Assignment rule not found' });
      }
      
      res.json({ message: 'Assignment rule deleted successfully' });
    }
  );
});

// Update escalation days setting
router.put('/escalation/settings', authenticate, requirePermission('manage_templates'), (req, res) => {
  const { escalationDays } = req.body;
  const dbInstance = db.getDb();
  
  if (escalationDays === undefined || isNaN(escalationDays) || escalationDays < 1) {
    return res.status(400).json({ error: 'escalationDays must be a positive number' });
  }
  
  // Store in app_settings table
  dbInstance.run(
    `INSERT INTO app_settings (setting_key, setting_value, description, updated_by)
     VALUES ('escalation_days', ?, 'Number of days before action items are escalated', ?)
     ON CONFLICT(setting_key) DO UPDATE SET 
       setting_value = excluded.setting_value,
       updated_at = CURRENT_TIMESTAMP,
       updated_by = excluded.updated_by`,
    [escalationDays.toString(), req.user.id],
    function(err) {
      if (err) {
        logger.error('Error updating escalation days:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      logger.info(`[Assignment Rules] Escalation days updated to ${escalationDays} by user ${req.user.id}`);
      res.json({ message: 'Escalation days updated successfully', escalationDays });
    }
  );
});

// Get escalation history for an action item
router.get('/escalation-history/:actionId', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const actionId = parseInt(req.params.actionId, 10);
  
  if (isNaN(actionId)) {
    return res.status(400).json({ error: 'Invalid action ID' });
  }
  
  // Get action item with escalation info
  dbInstance.get(
    `SELECT ai.*, 
            u1.name as assigned_to_name,
            u2.name as escalated_to_name,
            a.restaurant_name,
            ci.title as item_title
     FROM action_items ai
     LEFT JOIN users u1 ON ai.assigned_to = u1.id
     LEFT JOIN users u2 ON ai.escalated_to = u2.id
     LEFT JOIN audits a ON ai.audit_id = a.id
     LEFT JOIN checklist_items ci ON ai.item_id = ci.id
     WHERE ai.id = ?`,
    [actionId],
    (err, action) => {
      if (err) {
        logger.error('Error fetching escalation history:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!action) {
        return res.status(404).json({ error: 'Action item not found' });
      }
      
      // Get escalation comments if they exist
      dbInstance.all(
        `SELECT ac.*, u.name as user_name
         FROM action_comments ac
         LEFT JOIN users u ON ac.user_id = u.id
         WHERE ac.action_id = ? AND ac.comment LIKE '%[AUTO-ESCALATED]%'
         ORDER BY ac.created_at DESC`,
        [actionId],
        (err, comments) => {
          if (err && !err.message.includes('no such table')) {
            logger.error('Error fetching escalation comments:', err);
          }
          
          const history = {
            action: {
              id: action.id,
              title: action.title,
              assigned_to: action.assigned_to,
              assigned_to_name: action.assigned_to_name,
              escalated_to: action.escalated_to,
              escalated_to_name: action.escalated_to_name,
              escalated: action.escalated,
              escalated_at: action.escalated_at,
              due_date: action.due_date,
              status: action.status
            },
            escalationComments: comments || []
          };
          
          res.json(history);
        }
      );
    }
  );
});

// Get all escalated action items
router.get('/escalated', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  
  dbInstance.all(
    `SELECT ai.*,
            u1.name as assigned_to_name,
            u2.name as escalated_to_name,
            a.restaurant_name,
            ci.title as item_title,
            ci.category
     FROM action_items ai
     LEFT JOIN users u1 ON ai.assigned_to = u1.id
     LEFT JOIN users u2 ON ai.escalated_to = u2.id
     LEFT JOIN audits a ON ai.audit_id = a.id
     LEFT JOIN checklist_items ci ON ai.item_id = ci.id
     WHERE ai.escalated = 1 OR ai.escalated = true
     ORDER BY ai.escalated_at DESC
     LIMIT 100`,
    [],
    (err, escalatedActions) => {
      if (err) {
        logger.error('Error fetching escalated actions:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json(escalatedActions || []);
    }
  );
});

module.exports = router;
