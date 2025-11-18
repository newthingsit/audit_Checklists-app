const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');

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
        'INSERT INTO checklist_items (template_id, title, description, category, required, order_index) VALUES (?, ?, ?, ?, ?, ?)',
        [
          templateId,
          item.title,
          item.description || '',
          item.category || defaultCategory,
          item.required !== false ? 1 : 0,
          item.order_index !== undefined ? item.order_index : index
        ]
      );

      if (item.options && Array.isArray(item.options) && item.options.length > 0) {
        await insertItemOptions(dbInstance, itemId, item.options);
      }
    });
  }, Promise.resolve());
};

// Get all checklist templates
router.get('/', authenticate, (req, res) => {
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
      console.error('Checklists error:', err);
      console.error('Query:', query);
      console.error('DB Type:', dbType);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json({ templates: templates || [] });
  });
});

// Get single checklist template with items
router.get('/:id', authenticate, (req, res) => {
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
              
              // Attach options to items
              const itemsWithOptions = items.map(item => ({
                ...item,
                options: optionsByItem[item.id] || []
              }));
              
              res.json({ template, items: itemsWithOptions });
            }
          );
        }
      );
    }
  );
});

// Create new checklist template
router.post('/', authenticate, async (req, res) => {
  const { name, category, description, items } = req.body;
  const dbInstance = db.getDb();

  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  try {
    const { lastID: templateId } = await runDb(
      dbInstance,
      'INSERT INTO checklist_templates (name, category, description, created_by) VALUES (?, ?, ?, ?)',
      [name, category, description || '', req.user.id]
    );

    if (Array.isArray(items) && items.length > 0) {
      await insertItemsWithOptions(dbInstance, templateId, items, category);
    }

    res.status(201).json({ id: templateId, message: 'Template created successfully' });
  } catch (error) {
    console.error('Error creating checklist template:', error);
    res.status(500).json({ error: 'Error creating template', details: error.message });
  }
});

// Import checklist template from CSV
router.post('/import', authenticate, (req, res) => {
  const { csvData, templateName, category, description } = req.body;
  const dbInstance = db.getDb();

  if (!csvData || !templateName || !category) {
    return res.status(400).json({ error: 'CSV data, template name, and category are required' });
  }

  try {
    // Parse CSV data
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV must have at least a header and one data row' });
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const titleIndex = headers.findIndex(h => h.includes('title') || h.includes('item'));
    const descIndex = headers.findIndex(h => h.includes('description') || h.includes('desc'));
    const catIndex = headers.findIndex(h => h.includes('category') || h.includes('cat'));
    const reqIndex = headers.findIndex(h => h.includes('required') || h.includes('mandatory'));
    const optionsIndex = headers.findIndex(h => h.includes('option'));

    if (titleIndex === -1) {
      return res.status(400).json({ error: 'CSV must have a "title" or "item" column' });
    }

    // Parse data rows
    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values[titleIndex]) {
        const itemOptions = [];
        if (optionsIndex !== -1 && values[optionsIndex]) {
          values[optionsIndex]
            .split(';')
            .map(option => option.trim())
            .filter(Boolean)
            .forEach((option, optionIndex) => {
              const [label, score] = option.split(':');
              if (label) {
                itemOptions.push({
                  option_text: label.trim(),
                  mark: score !== undefined ? score.trim() : '',
                  order_index: optionIndex
                });
              }
            });
        }

        items.push({
          title: values[titleIndex],
          description: descIndex !== -1 ? values[descIndex] || '' : '',
          category: catIndex !== -1 ? values[catIndex] || category : category,
          required: reqIndex !== -1 ? (values[reqIndex]?.toLowerCase() === 'yes' || values[reqIndex]?.toLowerCase() === 'true' || values[reqIndex] === '1') : true,
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
      [templateName, category, description || '', req.user.id]
    ).then(async ({ lastID: templateId }) => {
      if (!templateId || templateId === 0) {
        return res.status(500).json({ error: 'Failed to create template - no ID returned' });
      }

      // Insert items with options using the helper function
      try {
        await insertItemsWithOptions(dbInstance, templateId, items, category);
        res.status(201).json({ 
          id: templateId, 
          message: `Template created successfully with ${items.length} items`,
          itemsCount: items.length
        });
      } catch (error) {
        console.error('Error inserting items:', error);
        res.status(500).json({ error: 'Error creating items', details: error.message });
      }
    }).catch((err) => {
      console.error('Error creating template:', err);
      res.status(500).json({ error: 'Error creating template', details: err.message });
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    res.status(400).json({ error: 'Error parsing CSV data', details: error.message });
  }
});

// Update checklist template
router.put('/:id', authenticate, async (req, res) => {
  const templateId = parseInt(req.params.id, 10);
  if (Number.isNaN(templateId)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  const { name, category, description, items } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
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
      [name, category, description || '', templateId]
    );

    if (Array.isArray(items)) {
      await runDb(dbInstance, 'DELETE FROM checklist_items WHERE template_id = ?', [templateId]);
      if (items.length > 0) {
        await insertItemsWithOptions(dbInstance, templateId, items, category);
      }
    }

    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating checklist template:', error);
    if (error && error.message && error.message.includes('FOREIGN KEY')) {
      return res.status(400).json({
        error: 'Cannot update template because it is referenced by existing audits'
      });
    }
    res.status(500).json({ error: 'Error updating template', details: error.message });
  }
});

// Delete checklist template
router.delete('/:id', authenticate, async (req, res) => {
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
      console.log(`Deleting ${auditCount.count} audit(s) and related data for template ${templateId}...`);

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
          console.log(`  Deleted audit_items referencing ${options.length} options`);
        }

        // Delete audit_items that reference these items
        await runDb(
          dbInstance,
          `DELETE FROM audit_items WHERE item_id IN (${itemIds.map(() => '?').join(',')})`,
          itemIds
        );
        console.log(`  Deleted audit_items referencing ${items.length} items`);
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
      console.log(`  Deleted ${auditCount.count} audit(s)`);
    }

    // Check for scheduled audits using this template
    // Delete scheduled audits that reference this template
    const scheduledDeleteResult = await runDb(
      dbInstance,
      'DELETE FROM scheduled_audits WHERE template_id = ?',
      [templateId]
    );
    if (scheduledDeleteResult && scheduledDeleteResult.changes > 0) {
      console.log(`  Deleted ${scheduledDeleteResult.changes} scheduled audit(s) for template ${templateId}`);
    }

    // Now delete the template (cascade will delete items and options)
    await runDb(dbInstance, 'DELETE FROM checklist_templates WHERE id = ?', [templateId]);
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist template:', error);
    res.status(500).json({ error: 'Error deleting template', details: error.message });
  }
});

module.exports = router;

