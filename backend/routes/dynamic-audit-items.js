const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Helper function to run database queries
const runDb = (dbInstance, query, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.run(query, params, function(err, result) {
      if (err) return reject(err);
      const lastID = result && result.lastID !== undefined ? result.lastID : this.lastID;
      const changes = result && result.changes !== undefined ? result.changes : this.changes;
      resolve({ lastID, changes });
    });
  });

const getDbRow = (dbInstance, query, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

// Add a dynamic item to an audit during the audit process
// This allows auditors to add items that weren't in the original template
router.post('/audits/:auditId/dynamic-items', authenticate, async (req, res) => {
  const { auditId } = req.params;
  const { 
    title, 
    description, 
    category,
    is_time_based,
    target_time_minutes,
    min_time_minutes,
    max_time_minutes,
    time_entries // Array of time values for preparation time tracking
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Item title is required' });
  }

  const dbInstance = db.getDb();

  try {
    // Verify audit exists and belongs to user (or user has permission)
    const audit = await getDbRow(
      dbInstance,
      'SELECT * FROM audits WHERE id = ?',
      [auditId]
    );

    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    // Check if audit is completed
    if (audit.status === 'completed') {
      return res.status(400).json({ error: 'Cannot add items to a completed audit' });
    }

    // Verify user owns the audit or has admin permissions
    if (audit.user_id !== req.user.id) {
      const userRole = req.user.role ? req.user.role.toLowerCase() : '';
      if (userRole !== 'admin' && userRole !== 'superadmin') {
        return res.status(403).json({ error: 'Not authorized to modify this audit' });
      }
    }

    // Create a temporary checklist item for this audit
    // We'll use order_index = -1 to indicate it's a dynamic item
    const { lastID: itemId } = await runDb(
      dbInstance,
      `INSERT INTO checklist_items 
       (template_id, title, description, category, required, order_index, is_time_based, target_time_minutes, min_time_minutes, max_time_minutes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        audit.template_id,
        title,
        description || '',
        category || '',
        1, // required
        -1, // Special order_index to mark as dynamic item
        is_time_based ? 1 : 0,
        target_time_minutes || null,
        min_time_minutes || null,
        max_time_minutes || null
      ]
    );

    // Calculate average time and score if time_entries provided
    let averageTime = null;
    let timeBasedScore = null;
    if (time_entries && Array.isArray(time_entries) && time_entries.length > 0) {
      averageTime = time_entries.reduce((sum, t) => sum + t, 0) / time_entries.length;
      averageTime = Math.round(averageTime * 100) / 100;

      // Calculate score based on time constraints
      if (is_time_based && (min_time_minutes || max_time_minutes || target_time_minutes)) {
        const min = parseFloat(min_time_minutes) || 0;
        const max = parseFloat(max_time_minutes) || Infinity;
        const target = parseFloat(target_time_minutes) || null;

        if (target && averageTime === target) {
          timeBasedScore = 100;
        } else if (averageTime >= min && averageTime <= max) {
          timeBasedScore = 100;
        } else if (averageTime < min) {
          // Faster than minimum - may indicate rushing
          const deviation = (min - averageTime) / min;
          timeBasedScore = Math.max(0, 100 - (deviation * 100));
        } else if (averageTime > max) {
          // Slower than maximum - needs improvement
          const deviation = (averageTime - max) / max;
          timeBasedScore = Math.max(0, 100 - (deviation * 50));
        }
        timeBasedScore = Math.round(timeBasedScore);
      }
    }

    // Create audit item response
    const mark = timeBasedScore !== null ? String(timeBasedScore) : null;
    const status = timeBasedScore !== null ? 'completed' : 'pending';

    const { lastID: auditItemId } = await runDb(
      dbInstance,
      `INSERT INTO audit_items 
       (audit_id, item_id, response, selected_option_id, mark, status, time_entries_json, average_time_minutes, time_based_score) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditId,
        itemId,
        description || '',
        null,
        mark,
        status,
        time_entries ? JSON.stringify(time_entries) : null,
        averageTime,
        timeBasedScore
      ]
    );

    // Update audit total_items count
    await runDb(
      dbInstance,
      'UPDATE audits SET total_items = total_items + 1 WHERE id = ?',
      [auditId]
    );

    logger.info(`[Dynamic Items] Added item "${title}" to audit ${auditId}`);

    res.status(201).json({
      message: 'Dynamic item added successfully',
      item: {
        id: itemId,
        audit_item_id: auditItemId,
        title,
        description,
        category,
        is_time_based: is_time_based ? 1 : 0,
        average_time_minutes: averageTime,
        time_based_score: timeBasedScore,
        mark,
        status
      }
    });
  } catch (error) {
    logger.error('[Dynamic Items] Error adding dynamic item:', error);
    res.status(500).json({ error: 'Failed to add dynamic item' });
  }
});

// Get all dynamic items for an audit
router.get('/audits/:auditId/dynamic-items', authenticate, async (req, res) => {
  const { auditId } = req.params;
  const dbInstance = db.getDb();

  try {
    const items = await new Promise((resolve, reject) => {
      dbInstance.all(
        `SELECT ci.*, ai.response, ai.mark, ai.status, ai.time_entries_json, ai.average_time_minutes, ai.time_based_score
         FROM checklist_items ci
         INNER JOIN audit_items ai ON ci.id = ai.item_id
         WHERE ai.audit_id = ? AND ci.order_index = -1
         ORDER BY ci.id ASC`,
        [auditId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });

    res.json({ items });
  } catch (error) {
    logger.error('[Dynamic Items] Error fetching dynamic items:', error);
    res.status(500).json({ error: 'Failed to fetch dynamic items' });
  }
});

// Delete a dynamic item from an audit
router.delete('/audits/:auditId/dynamic-items/:itemId', authenticate, async (req, res) => {
  const { auditId, itemId } = req.params;
  const dbInstance = db.getDb();

  try {
    // Verify audit and item
    const audit = await getDbRow(
      dbInstance,
      'SELECT * FROM audits WHERE id = ?',
      [auditId]
    );

    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    if (audit.status === 'completed') {
      return res.status(400).json({ error: 'Cannot delete items from a completed audit' });
    }

    // Verify user owns the audit or has admin permissions
    if (audit.user_id !== req.user.id) {
      const userRole = req.user.role ? req.user.role.toLowerCase() : '';
      if (userRole !== 'admin' && userRole !== 'superadmin') {
        return res.status(403).json({ error: 'Not authorized to modify this audit' });
      }
    }

    // Delete audit item
    await runDb(
      dbInstance,
      'DELETE FROM audit_items WHERE audit_id = ? AND item_id = ?',
      [auditId, itemId]
    );

    // Delete checklist item
    await runDb(
      dbInstance,
      'DELETE FROM checklist_items WHERE id = ? AND order_index = -1',
      [itemId]
    );

    // Update audit total_items count
    await runDb(
      dbInstance,
      'UPDATE audits SET total_items = total_items - 1 WHERE id = ?',
      [auditId]
    );

    logger.info(`[Dynamic Items] Deleted item ${itemId} from audit ${auditId}`);

    res.json({ message: 'Dynamic item deleted successfully' });
  } catch (error) {
    logger.error('[Dynamic Items] Error deleting dynamic item:', error);
    res.status(500).json({ error: 'Failed to delete dynamic item' });
  }
});

module.exports = router;

