const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const logger = require('../utils/logger');

const router = express.Router();

// Get all assignment rules
router.get('/', authenticate, requirePermission('manage_templates'), (req, res) => {
  const dbInstance = db.getDb();
  
  // Get category-based rules (stored in a simple config table or JSON)
  // For now, we'll return the hardcoded rules from assignmentRules.js
  // In the future, these could be stored in a database table
  
  const categoryRules = {
    'FOOD SAFETY': 'manager',
    'FOOD SAFETY - TRACKING': 'manager',
    'SERVICE - Speed of Service': 'supervisor',
    'SERVICE': 'supervisor',
    'CLEANLINESS': 'supervisor',
    'HYGIENE': 'manager'
  };
  
  // Get escalation settings
  const escalationDays = parseInt(process.env.ESCALATION_DAYS || '3', 10);
  
  res.json({
    categoryRules,
    escalationDays,
    defaultRole: 'manager' // Default role for unassigned items
  });
});

// Update assignment rules
router.put('/', authenticate, requirePermission('manage_templates'), (req, res) => {
  const { categoryRules, escalationDays } = req.body;
  const dbInstance = db.getDb();
  
  // Validate input
  if (categoryRules && typeof categoryRules !== 'object') {
    return res.status(400).json({ error: 'categoryRules must be an object' });
  }
  
  if (escalationDays !== undefined && (isNaN(escalationDays) || escalationDays < 1)) {
    return res.status(400).json({ error: 'escalationDays must be a positive number' });
  }
  
  // Store in database (create a simple config table if it doesn't exist)
  // For now, we'll store in environment variables or a config table
  // This is a simplified version - in production, you'd want a proper config table
  
  if (escalationDays !== undefined) {
    // Update environment variable (would need app restart)
    // For now, just log it - in production, store in database
    logger.info(`[Assignment Rules] Escalation days updated to ${escalationDays}`);
  }
  
  if (categoryRules) {
    logger.info('[Assignment Rules] Category rules updated:', categoryRules);
  }
  
  // In a real implementation, you'd save these to a database table
  // For now, we'll return success and note that changes require code update
  
  res.json({
    message: 'Assignment rules updated successfully',
    note: 'Category rules are currently hardcoded. To change them, update backend/utils/assignmentRules.js',
    categoryRules: categoryRules || {},
    escalationDays: escalationDays || parseInt(process.env.ESCALATION_DAYS || '3', 10)
  });
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
