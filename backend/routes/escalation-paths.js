const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const logger = require('../utils/logger');

const router = express.Router();

// Get all escalation paths
router.get('/', authenticate, requirePermission('manage_templates'), (req, res) => {
  const dbInstance = db.getDb();
  
  dbInstance.all(
    `SELECT * FROM escalation_paths 
     WHERE is_active = 1 
     ORDER BY name, level ASC`,
    [],
    (err, paths) => {
      if (err) {
        logger.error('Error fetching escalation paths:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      // Group paths by name
      const groupedPaths = {};
      (paths || []).forEach(path => {
        if (!groupedPaths[path.name]) {
          groupedPaths[path.name] = [];
        }
        groupedPaths[path.name].push(path);
      });
      
      res.json({ 
        paths: paths || [],
        grouped: groupedPaths
      });
    }
  );
});

// Get a specific escalation path by name
router.get('/:name', authenticate, requirePermission('manage_templates'), (req, res) => {
  const dbInstance = db.getDb();
  const { name } = req.params;
  
  dbInstance.all(
    `SELECT * FROM escalation_paths 
     WHERE name = ? AND is_active = 1 
     ORDER BY level ASC`,
    [name],
    (err, paths) => {
      if (err) {
        logger.error('Error fetching escalation path:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      res.json({ paths: paths || [] });
    }
  );
});

// Create a new escalation path level
router.post('/', authenticate, requirePermission('manage_templates'), (req, res) => {
  const { name, level, role, days_before_escalation } = req.body;
  const dbInstance = db.getDb();
  
  if (!name || !level || !role || days_before_escalation === undefined) {
    return res.status(400).json({ error: 'Name, level, role, and days_before_escalation are required' });
  }
  
  // Check if path with same name and level already exists
  dbInstance.get(
    `SELECT id FROM escalation_paths WHERE name = ? AND level = ?`,
    [name, level],
    (err, existing) => {
      if (err) {
        logger.error('Error checking existing path:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (existing) {
        return res.status(400).json({ error: `Escalation path "${name}" level ${level} already exists` });
      }
      
      // Insert new path
      dbInstance.run(
        `INSERT INTO escalation_paths (name, level, role, days_before_escalation, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [name, level, role, days_before_escalation],
        function(insertErr) {
          if (insertErr) {
            logger.error('Error creating escalation path:', insertErr);
            return res.status(500).json({ error: 'Database error', details: insertErr.message });
          }
          
          res.status(201).json({
            id: this.lastID,
            message: 'Escalation path level created successfully'
          });
        }
      );
    }
  );
});

// Update an escalation path level
router.put('/:id', authenticate, requirePermission('manage_templates'), (req, res) => {
  const { id } = req.params;
  const { name, level, role, days_before_escalation, is_active } = req.body;
  const dbInstance = db.getDb();
  
  if (!name || !level || !role || days_before_escalation === undefined) {
    return res.status(400).json({ error: 'Name, level, role, and days_before_escalation are required' });
  }
  
  dbInstance.run(
    `UPDATE escalation_paths 
     SET name = ?, level = ?, role = ?, days_before_escalation = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, level, role, days_before_escalation, is_active !== undefined ? is_active : 1, id],
    function(err) {
      if (err) {
        logger.error('Error updating escalation path:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Escalation path not found' });
      }
      
      res.json({ message: 'Escalation path updated successfully' });
    }
  );
});

// Delete an escalation path level
router.delete('/:id', authenticate, requirePermission('manage_templates'), (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();
  
  dbInstance.run(
    `DELETE FROM escalation_paths WHERE id = ?`,
    [id],
    function(err) {
      if (err) {
        logger.error('Error deleting escalation path:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Escalation path not found' });
      }
      
      res.json({ message: 'Escalation path deleted successfully' });
    }
  );
});

// Delete all levels of an escalation path by name
router.delete('/name/:name', authenticate, requirePermission('manage_templates'), (req, res) => {
  const { name } = req.params;
  const dbInstance = db.getDb();
  
  dbInstance.run(
    `DELETE FROM escalation_paths WHERE name = ?`,
    [name],
    function(err) {
      if (err) {
        logger.error('Error deleting escalation path:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      res.json({ 
        message: `Escalation path "${name}" deleted successfully`,
        deleted: this.changes
      });
    }
  );
});

module.exports = router;
