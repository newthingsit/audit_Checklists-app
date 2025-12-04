const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const logger = require('../utils/logger');

const router = express.Router();

const isAdminUser = (user) => {
  if (!user) return false;
  const role = user.role ? user.role.toLowerCase() : '';
  return role === 'admin' || role === 'superadmin';
};

const runDb = (dbInstance, query, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.run(
      query,
      params,
      function(err, result) {
        if (err) return reject(err);
        const lastID = result && result.lastID !== undefined ? result.lastID : this.lastID;
        const changes = result && result.changes !== undefined ? result.changes : this.changes;
        resolve({ lastID, changes });
      }
    );
  });

const getDbRow = (dbInstance, query, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const getAllRows = (dbInstance, query, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

const insertItemOptions = (dbInstance, itemId, options = []) => {
  if (!Array.isArray(options) || options.length === 0) {
    return Promise.resolve();
  }

  return options.reduce((promise, option, index) => {
    return promise.then(() =>
      runDb(
        dbInstance,
        'INSERT INTO checklist_item_options (item_id, option_text, mark, order_index) VALUES (?, ?, ?, ?)',
        [
          itemId,
          option.option_text || option.title || '',
          option.mark !== undefined ? option.mark : option.score || '',
          option.order_index !== undefined ? option.order_index : index
        ]
      )
    );
  }, Promise.resolve());
};

const insertItemsWithOptions = (dbInstance, templateId, items = [], defaultCategory = '') => {
  if (!Array.isArray(items) || items.length === 0) {
    return Promise.resolve();
  }

  return items.reduce((promise, item, index) => {
    return promise.then(async () => {
      if (!item.title || !item.title.trim()) {
        return;
      }

      const { lastID: itemId } = await runDb(
        dbInstance,
        'INSERT INTO checklist_items (template_id, title, description, category, required, order_index, weight, is_critical) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          templateId,
          item.title,
          item.description || '',
          item.category || defaultCategory,
          item.required !== false ? 1 : 0,
          item.order_index !== undefined ? item.order_index : index,
          item.weight || 1,
          item.is_critical ? 1 : 0
        ]
      );

      if (item.options && Array.isArray(item.options) && item.options.length > 0) {
        await insertItemOptions(dbInstance, itemId, item.options);
      }
    });
  }, Promise.resolve());
};

// Get all checklist templates
router.get('/', authenticate, requirePermission('display_templates', 'view_templates', 'manage_templates'), (req, res) => {
  const dbInstance = db.getDb();
  const dbType = process.env.DB_TYPE ? process.env.DB_TYPE.toLowerCase() : 'sqlite';
  
  // SQL Server requires all non-aggregated columns in GROUP BY
  // TEXT/NTEXT columns cannot be used in GROUP BY/ORDER BY, so we need to CAST them
  let query;
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    query = `SELECT ct.id, ct.name, ct.category, 
     CAST(ct.description AS NVARCHAR(MAX)) as description, 
     ct.created_by, ct.created_at,
     u.name as created_by_name,
     COUNT(ci.id) as item_count
     FROM checklist_templates ct
     LEFT JOIN users u ON ct.created_by = u.id
     LEFT JOIN checklist_items ci ON ct.id = ci.template_id
     GROUP BY ct.id, ct.name, ct.category, CAST(ct.description AS NVARCHAR(MAX)), ct.created_by, ct.created_at, u.name
     ORDER BY ct.created_at DESC`;
  } else {
    query = `SELECT ct.*, u.name as created_by_name,
     COUNT(ci.id) as item_count
     FROM checklist_templates ct
     LEFT JOIN users u ON ct.created_by = u.id
     LEFT JOIN checklist_items ci ON ct.id = ci.template_id
     GROUP BY ct.id
     ORDER BY ct.created_at DESC`;
  }
  
  dbInstance.all(query, [], (err, templates) => {
    if (err) {
      logger.error('Checklists error:', err);
      logger.error('Query:', query);
      logger.error('DB Type:', dbType);
      logger.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ templates: templates || [] });
  });
});

// Get single checklist template with items
router.get('/:id', authenticate, (req, res) => {
  const { getUserPermissions, hasPermission } = require('../middleware/permissions');
  const isAdmin = isAdminUser(req.user);
  
  // Check permissions - allow if user has template permissions OR start_scheduled_audits permission
  getUserPermissions(req.user.id, req.user.role, (permErr, userPermissions) => {
    if (permErr) {
      logger.error('Error fetching permissions:', permErr);
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    const canView = isAdmin || 
                   hasPermission(userPermissions, 'display_templates') ||
                   hasPermission(userPermissions, 'view_templates') ||
                   hasPermission(userPermissions, 'manage_templates') ||
                   hasPermission(userPermissions, 'start_scheduled_audits') ||
                   hasPermission(userPermissions, 'manage_scheduled_audits');

    if (!canView) {
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient permissions',
        required: ['display_templates', 'view_templates', 'manage_templates', 'start_scheduled_audits'],
        user_permissions: userPermissions
      });
    }

    const dbInstance = db.getDb();
  const templateId = req.params.id;

  dbInstance.get(
    'SELECT * FROM checklist_templates WHERE id = ?',
    [templateId],
    (err, template) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      dbInstance.all(
        'SELECT * FROM checklist_items WHERE template_id = ? ORDER BY order_index, id',
        [templateId],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Fetch options for each item
          if (items.length === 0) {
            return res.json({ template, items: [] });
          }
          
          const itemIds = items.map(item => item.id);
          const placeholders = itemIds.map(() => '?').join(',');
          
          dbInstance.all(
            `SELECT * FROM checklist_item_options WHERE item_id IN (${placeholders}) ORDER BY item_id, order_index, id`,
            itemIds,
            (err, options) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }
              
              // Group options by item_id
              const optionsByItem = {};
              options.forEach(option => {
                if (!optionsByItem[option.item_id]) {
                  optionsByItem[option.item_id] = [];
                }
                optionsByItem[option.item_id].push(option);
              });
              
              // Attach options to items, normalize option_text to text for compatibility
              const itemsWithOptions = items.map(item => ({
                ...item,
                options: (optionsByItem[item.id] || []).map(option => ({
                  ...option,
                  text: option.option_text // Add text field for mobile compatibility
                }))
              }));
              
              res.json({ template, items: itemsWithOptions });
            }
          );
        }
      );
    });
  });
});

// Create new checklist template
router.post('/', authenticate, requirePermission('manage_templates', 'create_templates', 'edit_templates'), async (req, res) => {
  const { name, category, description, items } = req.body;
  const dbInstance = db.getDb();

  if (!name) {
    return res.status(400).json({ error: 'Template name is required' });
  }

  try {
    const { lastID: templateId } = await runDb(
      dbInstance,
      'INSERT INTO checklist_templates (name, category, description, created_by) VALUES (?, ?, ?, ?)',
      [name, category || '', description || '', req.user.id]
    );

    if (Array.isArray(items) && items.length > 0) {
      await insertItemsWithOptions(dbInstance, templateId, items, category || '');
    }

    res.status(201).json({ id: templateId, message: 'Template created successfully' });
  } catch (error) {
    logger.error('Error creating checklist template:', error);
    logger.error('Error creating template:', error);
    res.status(500).json({ error: 'Error creating template' });
  }
});

// Import checklist template from CSV
router.post('/import', authenticate, requirePermission('manage_templates', 'create_templates', 'edit_templates'), (req, res) => {
  const { csvData, templateName, category, description } = req.body;
  const dbInstance = db.getDb();

  if (!csvData || !templateName) {
    return res.status(400).json({ error: 'CSV data and template name are required' });
  }

  try {
    // Improved CSV parser that handles quoted fields
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Parse CSV data
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV must have at least a header and one data row' });
    }

    // Parse header
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const titleIndex = headers.findIndex(h => h.includes('title') || h.includes('item') || h === 'name');
    const descIndex = headers.findIndex(h => h.includes('description') || h.includes('desc'));
    const catIndex = headers.findIndex(h => h.includes('category') || h.includes('cat'));
    const reqIndex = headers.findIndex(h => h.includes('required') || h.includes('mandatory'));
    const optionsIndex = headers.findIndex(h => h.includes('option'));

    if (titleIndex === -1) {
      return res.status(400).json({ error: 'CSV must have a "title", "item", or "name" column' });
    }

    // Default options if none provided
    const defaultOptions = [
      { option_text: 'Yes', mark: '3', order_index: 0 },
      { option_text: 'No', mark: '0', order_index: 1 },
      { option_text: 'N/A', mark: 'NA', order_index: 2 }
    ];

    // Parse data rows
    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const title = values[titleIndex]?.replace(/^"|"$/g, '').trim();
      
      if (title) {
        const itemOptions = [];
        if (optionsIndex !== -1 && values[optionsIndex]) {
          const optionsStr = values[optionsIndex].replace(/^"|"$/g, '');
          optionsStr.split(';').forEach((option, optionIndex) => {
            const trimmed = option.trim();
            if (trimmed) {
              const [label, score] = trimmed.split(':').map(s => s.trim());
              if (label) {
                itemOptions.push({
                  option_text: label,
                  mark: score || '',
                  order_index: optionIndex
                });
              }
            }
          });
        }

        // If no options provided, use defaults
        if (itemOptions.length === 0) {
          itemOptions.push(...defaultOptions);
        }

        items.push({
          title,
          description: descIndex !== -1 ? (values[descIndex]?.replace(/^"|"$/g, '').trim() || '') : '',
          category: catIndex !== -1 ? (values[catIndex]?.replace(/^"|"$/g, '').trim() || '') : (category || ''),
          required: reqIndex !== -1 
            ? (values[reqIndex]?.replace(/^"|"$/g, '').toLowerCase() === 'yes' || 
               values[reqIndex]?.replace(/^"|"$/g, '').toLowerCase() === 'true' || 
               values[reqIndex]?.replace(/^"|"$/g, '') === '1')
            : true,
          options: itemOptions
        });
      }
    }

    if (items.length === 0) {
      return res.status(400).json({ error: 'No valid items found in CSV' });
    }

    // Create template using runDb helper for cross-database compatibility
    runDb(
      dbInstance,
      'INSERT INTO checklist_templates (name, category, description, created_by) VALUES (?, ?, ?, ?)',
      [templateName, category || '', description || '', req.user.id]
    ).then(async ({ lastID: templateId }) => {
      if (!templateId || templateId === 0) {
        return res.status(500).json({ error: 'Failed to create template - no ID returned' });
      }

      // Insert items with options using the helper function
      try {
        await insertItemsWithOptions(dbInstance, templateId, items, category || '');
        res.status(201).json({ 
          id: templateId, 
          message: `Template created successfully with ${items.length} items`,
          itemsCount: items.length
        });
      } catch (error) {
        logger.error('Error inserting items:', error);
        logger.error('Error inserting items:', error);
        res.status(500).json({ error: 'Error creating items' });
      }
    }).catch((err) => {
      logger.error('Error creating template:', err);
      logger.error('Error creating template:', err);
      res.status(500).json({ error: 'Error creating template' });
    });
  } catch (error) {
    logger.error('Error parsing CSV:', error);
    logger.error('Error parsing CSV:', error);
    res.status(400).json({ error: 'Error parsing CSV data' });
  }
});

// Update checklist template
router.put('/:id', authenticate, requirePermission('manage_templates', 'edit_templates', 'update_templates'), async (req, res) => {
  const templateId = parseInt(req.params.id, 10);
  if (Number.isNaN(templateId)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  const { name, category, description, items } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Template name is required' });
  }

  const dbInstance = db.getDb();

  try {
    const template = await getDbRow(dbInstance, 'SELECT * FROM checklist_templates WHERE id = ?', [templateId]);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const isAdmin = isAdminUser(req.user);
    if (!isAdmin && template.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to edit this template' });
    }

    await runDb(
      dbInstance,
      'UPDATE checklist_templates SET name = ?, category = ?, description = ? WHERE id = ?',
      [name, category || '', description || '', templateId]
    );

    if (Array.isArray(items)) {
      await runDb(dbInstance, 'DELETE FROM checklist_items WHERE template_id = ?', [templateId]);
      if (items.length > 0) {
        await insertItemsWithOptions(dbInstance, templateId, items, category || '');
      }
    }

    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    logger.error('Error updating checklist template:', error);
    if (error && error.message && error.message.includes('FOREIGN KEY')) {
      return res.status(400).json({
        error: 'Cannot update template because it is referenced by existing audits'
      });
    }
    logger.error('Error updating template:', error);
    res.status(500).json({ error: 'Error updating template' });
  }
});

// Delete checklist template
router.delete('/:id', authenticate, requirePermission('manage_templates', 'delete_templates'), async (req, res) => {
  const templateId = parseInt(req.params.id, 10);
  if (Number.isNaN(templateId)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  const dbInstance = db.getDb();

  try {
    const template = await getDbRow(dbInstance, 'SELECT * FROM checklist_templates WHERE id = ?', [templateId]);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const isAdmin = isAdminUser(req.user);
    if (!isAdmin && template.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this template' });
    }

    // Check if there are audits using this template
    const auditCount = await getDbRow(
      dbInstance,
      'SELECT COUNT(*) as count FROM audits WHERE template_id = ?',
      [templateId]
    );

    if (auditCount && auditCount.count > 0) {
      logger.debug(`Deleting ${auditCount.count} audit(s) and related data for template ${templateId}...`);

      // Get all item IDs from this template
      const items = await getAllRows(
        dbInstance,
        'SELECT id FROM checklist_items WHERE template_id = ?',
        [templateId]
      );

      if (items.length > 0) {
        const itemIds = items.map(i => i.id);

        // Get all option IDs from these items
        const options = await getAllRows(
          dbInstance,
          `SELECT id FROM checklist_item_options WHERE item_id IN (${itemIds.map(() => '?').join(',')})`,
          itemIds
        );

        if (options.length > 0) {
          const optionIds = options.map(o => o.id);

          // Delete audit_items that reference these options
          await runDb(
            dbInstance,
            `DELETE FROM audit_items WHERE selected_option_id IN (${optionIds.map(() => '?').join(',')})`,
            optionIds
          );
          logger.debug(`  Deleted audit_items referencing ${options.length} options`);
        }

        // Delete audit_items that reference these items
        await runDb(
          dbInstance,
          `DELETE FROM audit_items WHERE item_id IN (${itemIds.map(() => '?').join(',')})`,
          itemIds
        );
        logger.debug(`  Deleted audit_items referencing ${items.length} items`);
      }

      // Delete action items for audits using this template
      await runDb(
        dbInstance,
        'DELETE FROM action_items WHERE audit_id IN (SELECT id FROM audits WHERE template_id = ?)',
        [templateId]
      );

      // Delete the audits themselves
      await runDb(
        dbInstance,
        'DELETE FROM audits WHERE template_id = ?',
        [templateId]
      );
      logger.debug(`  Deleted ${auditCount.count} audit(s)`);
    }

    // Check for scheduled audits using this template
    // Delete scheduled audits that reference this template
    const scheduledDeleteResult = await runDb(
      dbInstance,
      'DELETE FROM scheduled_audits WHERE template_id = ?',
      [templateId]
    );
    if (scheduledDeleteResult && scheduledDeleteResult.changes > 0) {
      logger.debug(`  Deleted ${scheduledDeleteResult.changes} scheduled audit(s) for template ${templateId}`);
    }

    // Now delete the template (cascade will delete items and options)
    await runDb(dbInstance, 'DELETE FROM checklist_templates WHERE id = ?', [templateId]);
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    logger.error('Error deleting checklist template:', error);
    logger.error('Error deleting template:', error);
    res.status(500).json({ error: 'Error deleting template' });
  }
});

// ========================================
// ENHANCED TEMPLATE FEATURES
// ========================================

// Clone/Duplicate a template
router.post('/:id/clone', authenticate, requirePermission('manage_templates', 'create_templates'), async (req, res) => {
  const templateId = parseInt(req.params.id, 10);
  const { name } = req.body;
  
  if (Number.isNaN(templateId)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }
  
  const dbInstance = db.getDb();
  
  try {
    // Get original template
    const template = await getDbRow(dbInstance, 'SELECT * FROM checklist_templates WHERE id = ?', [templateId]);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Create cloned template
    const newName = name || `${template.name} (Copy)`;
    const { lastID: newTemplateId } = await runDb(
      dbInstance,
      `INSERT INTO checklist_templates (name, category, description, created_by, version, tags) 
       VALUES (?, ?, ?, ?, 1, ?)`,
      [newName, template.category || '', template.description || '', req.user.id, template.tags || '']
    );
    
    // Get and clone items
    const items = await getAllRows(dbInstance, 'SELECT * FROM checklist_items WHERE template_id = ? ORDER BY order_index', [templateId]);
    
    for (const item of items) {
      const { lastID: newItemId } = await runDb(
        dbInstance,
        `INSERT INTO checklist_items (template_id, title, description, category, required, order_index, weight, max_score, section) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newTemplateId, item.title, item.description || '', item.category || '', item.required, item.order_index, item.weight || 1, item.max_score || 100, item.section || '']
      );
      
      // Clone item options
      const options = await getAllRows(dbInstance, 'SELECT * FROM checklist_item_options WHERE item_id = ? ORDER BY order_index', [item.id]);
      for (const opt of options) {
        await runDb(
          dbInstance,
          `INSERT INTO checklist_item_options (item_id, option_text, mark, order_index, score, is_passing) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [newItemId, opt.option_text, opt.mark || '', opt.order_index, opt.score || 0, opt.is_passing !== undefined ? opt.is_passing : 1]
        );
      }
    }
    
    res.status(201).json({ 
      id: newTemplateId, 
      message: 'Template cloned successfully',
      name: newName,
      itemsCount: items.length
    });
  } catch (error) {
    logger.error('Error cloning template:', error);
    res.status(500).json({ error: 'Error cloning template' });
  }
});

// Create new version of a template
router.post('/:id/version', authenticate, requirePermission('manage_templates', 'edit_templates'), async (req, res) => {
  const templateId = parseInt(req.params.id, 10);
  
  if (Number.isNaN(templateId)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }
  
  const dbInstance = db.getDb();
  
  try {
    // Get original template
    const template = await getDbRow(dbInstance, 'SELECT * FROM checklist_templates WHERE id = ?', [templateId]);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Mark old template as inactive
    await runDb(dbInstance, 'UPDATE checklist_templates SET is_active = 0 WHERE id = ?', [templateId]);
    
    // Get the highest version for this template chain
    const maxVersion = await getDbRow(
      dbInstance,
      `SELECT MAX(version) as max_ver FROM checklist_templates 
       WHERE id = ? OR parent_template_id = ? OR parent_template_id = (SELECT parent_template_id FROM checklist_templates WHERE id = ?)`,
      [templateId, templateId, templateId]
    );
    
    const newVersion = (maxVersion?.max_ver || template.version || 1) + 1;
    const parentId = template.parent_template_id || templateId;
    
    // Create new version
    const { lastID: newTemplateId } = await runDb(
      dbInstance,
      `INSERT INTO checklist_templates (name, category, description, created_by, version, parent_template_id, is_active, tags) 
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [template.name, template.category || '', template.description || '', req.user.id, newVersion, parentId, template.tags || '']
    );
    
    // Clone items to new version
    const items = await getAllRows(dbInstance, 'SELECT * FROM checklist_items WHERE template_id = ? ORDER BY order_index', [templateId]);
    
    for (const item of items) {
      const { lastID: newItemId } = await runDb(
        dbInstance,
        `INSERT INTO checklist_items (template_id, title, description, category, required, order_index, weight, max_score, section) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newTemplateId, item.title, item.description || '', item.category || '', item.required, item.order_index, item.weight || 1, item.max_score || 100, item.section || '']
      );
      
      const options = await getAllRows(dbInstance, 'SELECT * FROM checklist_item_options WHERE item_id = ? ORDER BY order_index', [item.id]);
      for (const opt of options) {
        await runDb(
          dbInstance,
          `INSERT INTO checklist_item_options (item_id, option_text, mark, order_index, score, is_passing) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [newItemId, opt.option_text, opt.mark || '', opt.order_index, opt.score || 0, opt.is_passing !== undefined ? opt.is_passing : 1]
        );
      }
    }
    
    res.status(201).json({ 
      id: newTemplateId, 
      message: 'New version created successfully',
      version: newVersion,
      previousVersion: template.version || 1
    });
  } catch (error) {
    logger.error('Error creating template version:', error);
    res.status(500).json({ error: 'Error creating template version' });
  }
});

// Get template version history
router.get('/:id/versions', authenticate, requirePermission('display_templates', 'view_templates'), async (req, res) => {
  const templateId = parseInt(req.params.id, 10);
  
  if (Number.isNaN(templateId)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }
  
  const dbInstance = db.getDb();
  
  try {
    // Get the parent template ID to find all versions
    const template = await getDbRow(dbInstance, 'SELECT * FROM checklist_templates WHERE id = ?', [templateId]);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const parentId = template.parent_template_id || templateId;
    
    // Get all versions
    const versions = await getAllRows(
      dbInstance,
      `SELECT ct.*, u.name as created_by_name,
       (SELECT COUNT(*) FROM checklist_items WHERE template_id = ct.id) as item_count,
       (SELECT COUNT(*) FROM audits WHERE template_id = ct.id) as audit_count
       FROM checklist_templates ct
       LEFT JOIN users u ON ct.created_by = u.id
       WHERE ct.id = ? OR ct.parent_template_id = ?
       ORDER BY ct.version DESC`,
      [parentId, parentId]
    );
    
    res.json({ 
      versions,
      currentVersion: template.version || 1,
      totalVersions: versions.length
    });
  } catch (error) {
    logger.error('Error fetching template versions:', error);
    res.status(500).json({ error: 'Error fetching template versions' });
  }
});

// Preview template (get full details without editing)
router.get('/:id/preview', authenticate, async (req, res) => {
  const templateId = parseInt(req.params.id, 10);
  
  if (Number.isNaN(templateId)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }
  
  const dbInstance = db.getDb();
  
  try {
    const template = await getDbRow(
      dbInstance,
      `SELECT ct.*, u.name as created_by_name 
       FROM checklist_templates ct 
       LEFT JOIN users u ON ct.created_by = u.id 
       WHERE ct.id = ?`,
      [templateId]
    );
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Get items grouped by section
    const items = await getAllRows(
      dbInstance,
      `SELECT * FROM checklist_items WHERE template_id = ? ORDER BY section, order_index`,
      [templateId]
    );
    
    // Get options for each item
    for (const item of items) {
      const options = await getAllRows(
        dbInstance,
        `SELECT * FROM checklist_item_options WHERE item_id = ? ORDER BY order_index`,
        [item.id]
      );
      item.options = options;
    }
    
    // Group items by section
    const sections = {};
    items.forEach(item => {
      const sectionName = item.section || 'General';
      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }
      sections[sectionName].push(item);
    });
    
    // Calculate scoring info
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    const maxPossibleScore = items.reduce((sum, item) => sum + (item.max_score || 100), 0);
    
    res.json({
      template: {
        ...template,
        tags: template.tags ? template.tags.split(',').map(t => t.trim()) : []
      },
      items,
      sections,
      stats: {
        totalItems: items.length,
        totalWeight,
        maxPossibleScore,
        sectionCount: Object.keys(sections).length
      }
    });
  } catch (error) {
    logger.error('Error previewing template:', error);
    res.status(500).json({ error: 'Error previewing template' });
  }
});

module.exports = router;

