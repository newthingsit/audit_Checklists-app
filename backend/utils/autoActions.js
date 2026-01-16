const logger = require('./logger');

/**
 * Automatically create action items from failed audit items
 * @param {Object} dbInstance - Database instance
 * @param {number} auditId - Audit ID
 * @param {Object} options - Options for auto-creation
 * @param {boolean} options.onlyCritical - Only create actions for critical items
 * @param {number} options.defaultDueDays - Default days until due date (default: 7)
 * @param {Function} callback - Callback function
 */
function autoCreateActionItems(dbInstance, auditId, options = {}, callback) {
  const { onlyCritical = false, defaultDueDays = 7 } = options;
  
  // Get audit details
  dbInstance.get('SELECT * FROM audits WHERE id = ?', [auditId], (err, audit) => {
    if (err || !audit) {
      logger.error('Error fetching audit for auto-actions:', err);
      return callback(err);
    }

    // Get failed audit items
    // Failed items are those with:
    // 1. status = 'failed'
    // 2. selected option with negative mark (No, N/A, etc.)
    // 3. is_critical = 1 (if onlyCritical is true)
    let failedItemsQuery = `
      SELECT ai.*, ci.title, ci.description, ci.category, ci.is_critical,
             cio.option_text, cio.mark
      FROM audit_items ai
      JOIN checklist_items ci ON ai.item_id = ci.id
      LEFT JOIN checklist_item_options cio ON ai.selected_option_id = cio.id
      WHERE ai.audit_id = ?
        AND (
          ai.status = 'failed'
          OR (cio.mark IS NOT NULL AND cio.mark IN ('No', 'N', 'NA', 'N/A', 'Fail', 'F'))
          OR (ai.status = 'completed' AND cio.mark IS NOT NULL AND cio.mark NOT IN ('Yes', 'Y', 'Pass', 'P', 'OK'))
        )
    `;
    
    if (onlyCritical) {
      failedItemsQuery += ' AND ci.is_critical = 1';
    }
    
    failedItemsQuery += ' ORDER BY ci.is_critical DESC, ci.order_index';

    dbInstance.all(failedItemsQuery, [auditId], (err, failedItems) => {
      if (err) {
        logger.error('Error fetching failed items for auto-actions:', err);
        return callback(err);
      }

      if (!failedItems || failedItems.length === 0) {
        logger.info(`[Auto-Actions] No failed items found for audit ${auditId}`);
        return callback(null, []);
      }

      // Check if action items already exist for these items
      const itemIds = failedItems.map(item => item.item_id);
      const placeholders = itemIds.map(() => '?').join(',');
      
      dbInstance.all(
        `SELECT item_id FROM action_items WHERE audit_id = ? AND item_id IN (${placeholders})`,
        [auditId, ...itemIds],
        (err, existingActions) => {
          if (err) {
            logger.error('Error checking existing actions:', err);
            return callback(err);
          }

          const existingItemIds = new Set((existingActions || []).map(a => a.item_id));
          const itemsToProcess = failedItems.filter(item => !existingItemIds.has(item.item_id));

          if (itemsToProcess.length === 0) {
            logger.info(`[Auto-Actions] All failed items already have action items for audit ${auditId}`);
            return callback(null, []);
          }

          // Determine assignee based on assignment rules
          // Use assignment rules system for smart assignment
          const { getAssigneeByRules } = require('./assignmentRules');
          
          // Group items by category for batch assignment
          const itemsByCategory = {};
          itemsToProcess.forEach(item => {
            const category = item.category || 'Uncategorized';
            if (!itemsByCategory[category]) {
              itemsByCategory[category] = [];
            }
            itemsByCategory[category].push(item);
          });

          // Get audit info for context
          dbInstance.get(
            `SELECT location_id, user_id FROM audits WHERE id = ?`,
            [auditId],
            (err, auditInfo) => {
              if (err) {
                logger.error('Error fetching audit info for assignment:', err);
                return callback(err);
              }

              // Process items by category to apply category-based rules
              const categories = Object.keys(itemsByCategory);
              let processedCategories = 0;
              const categoryAssignees = {};

              if (categories.length === 0) {
                return callback(null, []);
              }

              categories.forEach(category => {
                const categoryItems = itemsByCategory[category];
                const firstItem = categoryItems[0];
                
                // Get assignee for this category
                getAssigneeByRules(
                  dbInstance,
                  {
                    category: category,
                    locationId: auditInfo?.location_id,
                    isCritical: firstItem.is_critical,
                    auditUserId: audit.user_id
                  },
                  (err, assignee) => {
                    processedCategories++;
                    categoryAssignees[category] = assignee;
                    
                    // When all categories processed, create action items
                    if (processedCategories === categories.length) {
                      // Use category-specific assignee or fallback to first available
                      const defaultAssignee = Object.values(categoryAssignees).find(a => a) || null;
                      
                      // Create action items with category-specific assignees
                      createActionItemsWithAssignees(
                        dbInstance,
                        auditId,
                        itemsToProcess,
                        categoryAssignees,
                        defaultAssignee,
                        defaultDueDays,
                        callback
                      );
                    }
                  }
                );
              });
            }
          );
        }
      );
    });
  });
}

/**
 * Create action items with category-specific assignees
 */
function createActionItemsWithAssignees(dbInstance, auditId, items, categoryAssignees, defaultAssignee, defaultDueDays, callback) {
  const createdActions = [];
  let processed = 0;
  const errors = [];

  if (items.length === 0) {
    return callback(null, []);
  }

  items.forEach((item) => {
    const category = item.category || 'Uncategorized';
    const assignee = categoryAssignees[category] || defaultAssignee;
    
    // Determine priority based on item criticality
    const priority = item.is_critical ? 'high' : 'medium';
    
    // Create title from item title
    const title = `Fix: ${item.title}`;
    
    // Create description
    const description = [
      item.description || '',
      item.comment || '',
      item.option_text ? `Selected: ${item.option_text}` : '',
      item.mark ? `Mark: ${item.mark}` : ''
    ].filter(Boolean).join('\n\n');

    // Calculate due date (defaultDueDays from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + defaultDueDays);
    const dueDateStr = dueDate.toISOString().split('T')[0] + ' ' + dueDate.toTimeString().split(' ')[0];

    // Insert action item
    dbInstance.run(
      `INSERT INTO action_items (audit_id, item_id, title, description, assigned_to, due_date, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        auditId,
        item.item_id,
        title,
        description,
        assignee ? assignee.id : null,
        dueDateStr,
        priority
      ],
      function(err) {
        processed++;
        
        if (err) {
          logger.error(`Error creating auto-action for item ${item.item_id}:`, err);
          errors.push({ item_id: item.item_id, error: err.message });
        } else {
          const actionId = (this.lastID !== undefined) ? this.lastID : (this.lastID || 0);
          createdActions.push({
            id: actionId,
            item_id: item.item_id,
            title: title,
            assigned_to: assignee ? assignee.name : null
          });
          logger.info(`[Auto-Actions] Created action item ${actionId} for failed item "${item.title}" in audit ${auditId} (assigned to: ${assignee ? assignee.name : 'unassigned'})`);
        }

        // When all items are processed
        if (processed === items.length) {
          if (createdActions.length > 0) {
            logger.info(`[Auto-Actions] Created ${createdActions.length} action items for audit ${auditId}`);
          }
          if (errors.length > 0) {
            logger.warn(`[Auto-Actions] ${errors.length} errors creating action items for audit ${auditId}`);
          }
          callback(null, createdActions);
        }
      }
    );
  });
}

/**
 * Create action items for failed audit items (legacy function, kept for compatibility)
 */
function createActionItems(dbInstance, auditId, items, auditInfo, assignee, defaultDueDays, callback) {
  const createdActions = [];
  let processed = 0;
  const errors = [];

  if (items.length === 0) {
    return callback(null, []);
  }

  items.forEach((item, index) => {
    // Determine priority based on item criticality
    const priority = item.is_critical ? 'high' : 'medium';
    
    // Create title from item title
    const title = `Fix: ${item.title}`;
    
    // Create description
    const description = [
      item.description || '',
      item.comment || '',
      item.option_text ? `Selected: ${item.option_text}` : '',
      item.mark ? `Mark: ${item.mark}` : ''
    ].filter(Boolean).join('\n\n');

    // Calculate due date (defaultDueDays from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + defaultDueDays);
    const dueDateStr = dueDate.toISOString().split('T')[0] + ' ' + dueDate.toTimeString().split(' ')[0];

    // Insert action item
    dbInstance.run(
      `INSERT INTO action_items (audit_id, item_id, title, description, assigned_to, due_date, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        auditId,
        item.item_id,
        title,
        description,
        assignee ? assignee.id : null,
        dueDateStr,
        priority
      ],
      function(err) {
        processed++;
        
        if (err) {
          logger.error(`Error creating auto-action for item ${item.item_id}:`, err);
          errors.push({ item_id: item.item_id, error: err.message });
        } else {
          const actionId = (this.lastID !== undefined) ? this.lastID : (this.lastID || 0);
          createdActions.push({
            id: actionId,
            item_id: item.item_id,
            title: title
          });
          logger.info(`[Auto-Actions] Created action item ${actionId} for failed item "${item.title}" in audit ${auditId}`);
        }

        // When all items are processed
        if (processed === items.length) {
          if (createdActions.length > 0) {
            logger.info(`[Auto-Actions] Created ${createdActions.length} action items for audit ${auditId}`);
          }
          if (errors.length > 0) {
            logger.warn(`[Auto-Actions] ${errors.length} errors creating action items for audit ${auditId}`);
          }
          callback(null, createdActions);
        }
      }
    );
  });
}

module.exports = {
  autoCreateActionItems
};
