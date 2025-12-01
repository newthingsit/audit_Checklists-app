const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requirePermission, isAdminUser } = require('../middleware/permissions');
const logger = require('../utils/logger');

const router = express.Router();

// Get all store groups
router.get('/', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const { type, includeInactive } = req.query;
  
  let query = `
    SELECT sg.*, 
           pg.name as parent_name,
           u.name as created_by_name,
           (SELECT COUNT(*) FROM locations WHERE group_id = sg.id) as store_count
    FROM store_groups sg
    LEFT JOIN store_groups pg ON sg.parent_group_id = pg.id
    LEFT JOIN users u ON sg.created_by = u.id
  `;
  
  const conditions = [];
  const params = [];
  
  if (!includeInactive || includeInactive !== 'true') {
    conditions.push('sg.is_active = 1');
  }
  
  if (type) {
    conditions.push('sg.type = ?');
    params.push(type);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY sg.sort_order, sg.name';
  
  dbInstance.all(query, params, (err, groups) => {
    if (err) {
      logger.error('Error fetching store groups:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ groups: groups || [] });
  });
});

// Get group hierarchy (tree structure) - MUST BE BEFORE /:id route
router.get('/tree', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  
  dbInstance.all(
    `SELECT sg.*, 
     (SELECT COUNT(*) FROM locations WHERE group_id = sg.id) as store_count
     FROM store_groups sg
     WHERE sg.is_active = 1
     ORDER BY sg.sort_order, sg.name`,
    [],
    (err, groups) => {
      if (err) {
        logger.error('Error fetching group tree:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Build tree structure
      const buildTree = (items, parentId = null) => {
        return items
          .filter(item => item.parent_group_id === parentId)
          .map(item => ({
            ...item,
            children: buildTree(items, item.id)
          }));
      };
      
      const tree = buildTree(groups || []);
      res.json({ tree });
    }
  );
});

// Get single store group with its stores
router.get('/:id', authenticate, (req, res) => {
  const groupId = req.params.id;
  const dbInstance = db.getDb();
  
  dbInstance.get(
    `SELECT sg.*, pg.name as parent_name, u.name as created_by_name
     FROM store_groups sg
     LEFT JOIN store_groups pg ON sg.parent_group_id = pg.id
     LEFT JOIN users u ON sg.created_by = u.id
     WHERE sg.id = ?`,
    [groupId],
    (err, group) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      
      // Get stores in this group
      dbInstance.all(
        `SELECT id, name, store_number, city, address 
         FROM locations 
         WHERE group_id = ? 
         ORDER BY name`,
        [groupId],
        (err, stores) => {
          // Get child groups
          dbInstance.all(
            `SELECT id, name, type, 
             (SELECT COUNT(*) FROM locations WHERE group_id = store_groups.id) as store_count
             FROM store_groups 
             WHERE parent_group_id = ?
             ORDER BY sort_order, name`,
            [groupId],
            (err, children) => {
              res.json({
                group,
                stores: stores || [],
                childGroups: children || []
              });
            }
          );
        }
      );
    }
  );
});

// Create store group
router.post('/', authenticate, requirePermission('manage_locations', 'create_locations'), (req, res) => {
  const { name, code, type, description, parent_group_id, color, icon, sort_order } = req.body;
  const dbInstance = db.getDb();
  
  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  
  const validTypes = ['region', 'district', 'brand', 'franchise', 'custom'];
  const groupType = validTypes.includes(type) ? type : 'custom';
  
  dbInstance.run(
    `INSERT INTO store_groups (name, code, type, description, parent_group_id, color, icon, sort_order, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, code || null, groupType, description || '', parent_group_id || null, color || '#667eea', icon || 'folder', sort_order || 0, req.user.id],
    function(err) {
      if (err) {
        logger.error('Error creating store group:', err);
        return res.status(500).json({ error: 'Error creating group' });
      }
      
      res.status(201).json({
        id: this.lastID,
        message: 'Store group created successfully'
      });
    }
  );
});

// Update store group
router.put('/:id', authenticate, requirePermission('manage_locations', 'edit_locations'), (req, res) => {
  const groupId = req.params.id;
  const { name, code, type, description, parent_group_id, color, icon, is_active, sort_order } = req.body;
  const dbInstance = db.getDb();
  
  const updates = [];
  const params = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (code !== undefined) {
    updates.push('code = ?');
    params.push(code);
  }
  if (type !== undefined) {
    updates.push('type = ?');
    params.push(type);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (parent_group_id !== undefined) {
    // Prevent self-reference
    if (parent_group_id == groupId) {
      return res.status(400).json({ error: 'A group cannot be its own parent' });
    }
    updates.push('parent_group_id = ?');
    params.push(parent_group_id || null);
  }
  if (color !== undefined) {
    updates.push('color = ?');
    params.push(color);
  }
  if (icon !== undefined) {
    updates.push('icon = ?');
    params.push(icon);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }
  if (sort_order !== undefined) {
    updates.push('sort_order = ?');
    params.push(sort_order);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  
  if (updates.length === 1) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  params.push(groupId);
  
  dbInstance.run(
    `UPDATE store_groups SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        logger.error('Error updating store group:', err);
        return res.status(500).json({ error: 'Error updating group' });
      }
      res.json({ message: 'Store group updated successfully' });
    }
  );
});

// Delete store group
router.delete('/:id', authenticate, requirePermission('manage_locations', 'delete_locations'), (req, res) => {
  const groupId = req.params.id;
  const { reassignTo } = req.query;
  const dbInstance = db.getDb();
  
  // First check if there are stores or child groups
  dbInstance.get(
    `SELECT 
      (SELECT COUNT(*) FROM locations WHERE group_id = ?) as store_count,
      (SELECT COUNT(*) FROM store_groups WHERE parent_group_id = ?) as child_count`,
    [groupId, groupId],
    (err, counts) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (counts.child_count > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete group with child groups. Delete or move child groups first.' 
        });
      }
      
      // If there are stores and no reassignment target, return error
      if (counts.store_count > 0 && !reassignTo) {
        return res.status(400).json({ 
          error: `This group contains ${counts.store_count} stores. Provide 'reassignTo' parameter to move them.`,
          storeCount: counts.store_count
        });
      }
      
      // If reassigning stores
      if (reassignTo) {
        dbInstance.run(
          'UPDATE locations SET group_id = ? WHERE group_id = ?',
          [reassignTo === 'null' ? null : reassignTo, groupId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Error reassigning stores' });
            }
            
            // Now delete the group
            dbInstance.run('DELETE FROM store_groups WHERE id = ?', [groupId], (err) => {
              if (err) {
                return res.status(500).json({ error: 'Error deleting group' });
              }
              res.json({ message: 'Store group deleted successfully' });
            });
          }
        );
      } else {
        // No stores, just delete
        dbInstance.run('DELETE FROM store_groups WHERE id = ?', [groupId], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error deleting group' });
          }
          res.json({ message: 'Store group deleted successfully' });
        });
      }
    }
  );
});

// Assign stores to a group
router.post('/:id/stores', authenticate, requirePermission('manage_locations', 'edit_locations'), (req, res) => {
  const groupId = req.params.id;
  // Support both storeIds and store_ids for frontend compatibility
  const storeIds = req.body.storeIds || req.body.store_ids;
  const dbInstance = db.getDb();
  
  if (!Array.isArray(storeIds) || storeIds.length === 0) {
    return res.status(400).json({ error: 'storeIds or store_ids array is required' });
  }
  
  // Verify group exists
  dbInstance.get('SELECT id FROM store_groups WHERE id = ?', [groupId], (err, group) => {
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const placeholders = storeIds.map(() => '?').join(',');
    dbInstance.run(
      `UPDATE locations SET group_id = ? WHERE id IN (${placeholders})`,
      [groupId, ...storeIds],
      function(err) {
        if (err) {
          logger.error('Error assigning stores to group:', err);
          return res.status(500).json({ error: 'Error assigning stores' });
        }
        res.json({ 
          message: `${this.changes} store(s) assigned to group`,
          updated: this.changes
        });
      }
    );
  });
});

// Remove stores from group (unassign)
router.delete('/:id/stores', authenticate, requirePermission('manage_locations', 'edit_locations'), (req, res) => {
  const groupId = req.params.id;
  // Support both storeIds and store_ids for frontend compatibility
  const storeIds = req.body.storeIds || req.body.store_ids;
  const dbInstance = db.getDb();
  
  if (!Array.isArray(storeIds) || storeIds.length === 0) {
    return res.status(400).json({ error: 'storeIds or store_ids array is required' });
  }
  
  const placeholders = storeIds.map(() => '?').join(',');
  dbInstance.run(
    `UPDATE locations SET group_id = NULL WHERE group_id = ? AND id IN (${placeholders})`,
    [groupId, ...storeIds],
    function(err) {
      if (err) {
        logger.error('Error removing stores from group:', err);
        return res.status(500).json({ error: 'Error removing stores' });
      }
      res.json({ 
        message: `${this.changes} store(s) removed from group`,
        updated: this.changes
      });
    }
  );
});

// Get group hierarchy (tree structure) - alias endpoint
router.get('/tree/all', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  
  dbInstance.all(
    `SELECT sg.*, 
     (SELECT COUNT(*) FROM locations WHERE group_id = sg.id) as store_count
     FROM store_groups sg
     WHERE sg.is_active = 1
     ORDER BY sg.sort_order, sg.name`,
    [],
    (err, groups) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Build tree structure
      const buildTree = (items, parentId = null) => {
        return items
          .filter(item => item.parent_group_id === parentId)
          .map(item => ({
            ...item,
            children: buildTree(items, item.id)
          }));
      };
      
      const tree = buildTree(groups || []);
      res.json({ tree });
    }
  );
});

// Get analytics by group
router.get('/:id/analytics', authenticate, (req, res) => {
  const groupId = req.params.id;
  const dbInstance = db.getDb();
  const { period } = req.query;
  
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isMssql = dbType === 'mssql' || dbType === 'sqlserver';
  
  let dateFilter = '';
  if (period === 'month') {
    dateFilter = isMssql 
      ? "AND a.created_at >= DATEADD(day, -30, GETDATE())"
      : "AND a.created_at >= date('now', '-30 days')";
  } else if (period === 'quarter') {
    dateFilter = isMssql
      ? "AND a.created_at >= DATEADD(day, -90, GETDATE())"
      : "AND a.created_at >= date('now', '-90 days')";
  }
  
  const query = `
    SELECT 
      COUNT(a.id) as total_audits,
      SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_audits,
      ROUND(AVG(CAST(a.score AS FLOAT)), 1) as avg_score,
      MAX(a.score) as best_score,
      MIN(a.score) as lowest_score,
      COUNT(DISTINCT l.id) as stores_audited
    FROM audits a
    INNER JOIN locations l ON a.location_id = l.id
    WHERE l.group_id = ? AND a.status = 'completed' ${dateFilter}
  `;
  
  dbInstance.get(query, [groupId], (err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get store breakdown
    dbInstance.all(`
      SELECT l.id, l.name, l.store_number,
             COUNT(a.id) as audit_count,
             ROUND(AVG(CAST(a.score AS FLOAT)), 1) as avg_score
      FROM locations l
      LEFT JOIN audits a ON a.location_id = l.id AND a.status = 'completed'
      WHERE l.group_id = ?
      GROUP BY l.id, l.name, l.store_number
      ORDER BY avg_score DESC
    `, [groupId], (err, stores) => {
      res.json({
        stats: stats || {},
        stores: stores || [],
        period: period || 'all'
      });
    });
  });
});

module.exports = router;

