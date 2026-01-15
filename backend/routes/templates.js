const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Health check endpoint to test database connection
router.get('/health', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  
  // Simple query to test connection
  dbInstance.get('SELECT COUNT(*) as count FROM checklist_templates', [], (err, result) => {
    if (err) {
      logger.error('[Templates Health] Database error:', err);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: err.message 
      });
    }
    
    res.json({ 
      status: 'ok', 
      templateCount: result?.count || 0,
      dbType: dbType
    });
  });
});

// Get all templates (public endpoint for template selection)
router.get('/', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isMssql = dbType === 'mssql' || dbType === 'sqlserver';
  
  // Use a simpler, more reliable query approach
  // First get all templates, then get item counts separately to avoid GROUP BY issues
  let templatesQuery;
  if (isMssql) {
    // For MSSQL, use a simpler query without complex GROUP BY
    templatesQuery = `SELECT 
      ct.id, 
      ct.name, 
      ISNULL(ct.category, '') as category,
      CAST(ISNULL(ct.description, '') AS NVARCHAR(MAX)) as description,
      ct.created_by,
      ct.created_at,
      ISNULL(u.name, '') as created_by_name
    FROM checklist_templates ct
    LEFT JOIN users u ON ct.created_by = u.id
    ORDER BY ct.created_at DESC`;
  } else {
    templatesQuery = `SELECT 
      ct.*,
      u.name as created_by_name
    FROM checklist_templates ct
    LEFT JOIN users u ON ct.created_by = u.id
    ORDER BY ct.created_at DESC`;
  }
  
  dbInstance.all(templatesQuery, [], (err, templates) => {
    if (err) {
      logger.error('[Templates API] Query error:', err);
      logger.error('[Templates API] Query:', templatesQuery);
      logger.error('[Templates API] DB Type:', dbType);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (!templates || templates.length === 0) {
      logger.info(`[Templates API] No templates found for user ${req.user?.id}`);
      return res.json({ templates: [] });
    }
    
    logger.info(`[Templates API] Found ${templates.length} templates for user ${req.user?.id}`);
    
    // Get item counts for each template
    const templateIds = templates.map(t => t.id);
    const placeholders = templateIds.map(() => '?').join(',');
    
    let itemCountQuery;
    if (isMssql) {
      itemCountQuery = `SELECT template_id, COUNT(*) as item_count 
                       FROM checklist_items 
                       WHERE template_id IN (${placeholders})
                       GROUP BY template_id`;
    } else {
      itemCountQuery = `SELECT template_id, COUNT(*) as item_count 
                       FROM checklist_items 
                       WHERE template_id IN (${placeholders})
                       GROUP BY template_id`;
    }
    
    dbInstance.all(itemCountQuery, templateIds, (countErr, itemCounts) => {
      if (countErr) {
        logger.error('[Templates API] Item count query error:', countErr);
        // Continue without item counts
        const templatesWithDefaults = templates.map(t => ({
          ...t,
          item_count: 0,
          categories: []
        }));
        return res.json({ templates: templatesWithDefaults });
      }
      
      // Create a map of template_id -> item_count
      const countMap = {};
      itemCounts.forEach(row => {
        countMap[row.template_id] = row.item_count || 0;
      });
      
      // Get unique categories for each template
      let categoryQuery;
      if (isMssql) {
        categoryQuery = `SELECT DISTINCT template_id, category 
                        FROM checklist_items 
                        WHERE template_id IN (${placeholders}) 
                        AND category IS NOT NULL 
                        AND LTRIM(RTRIM(category)) != ''`;
      } else {
        categoryQuery = `SELECT DISTINCT template_id, category 
                        FROM checklist_items 
                        WHERE template_id IN (${placeholders}) 
                        AND category IS NOT NULL 
                        AND category != ''`;
      }
      
      dbInstance.all(categoryQuery, templateIds, (catErr, categoryRows) => {
        if (catErr) {
          logger.error('[Templates API] Category query error:', catErr);
          // Continue without categories
          const templatesWithCounts = templates.map(t => ({
            ...t,
            item_count: countMap[t.id] || 0,
            categories: []
          }));
          return res.json({ templates: templatesWithCounts });
        }
        
        // Group categories by template_id
        const categoriesByTemplate = {};
        categoryRows.forEach(row => {
          if (row.template_id && row.category) {
            if (!categoriesByTemplate[row.template_id]) {
              categoriesByTemplate[row.template_id] = [];
            }
            const category = String(row.category).trim();
            if (category && !categoriesByTemplate[row.template_id].includes(category)) {
              categoriesByTemplate[row.template_id].push(category);
            }
          }
        });
        
        // Combine all data
        const templatesWithCategories = templates.map(template => ({
          ...template,
          item_count: countMap[template.id] || 0,
          categories: categoriesByTemplate[template.id] || []
        }));
        
        logger.info(`[Templates API] Returning ${templatesWithCategories.length} templates with categories`);
        res.json({ templates: templatesWithCategories });
      });
    });
  });
});

// Admin endpoint to update Speed of Service category items
// POST /api/templates/admin/update-speed-of-service
router.post('/admin/update-speed-of-service', authenticate, async (req, res) => {
  try {
    // Only allow admin users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { templateName = 'CVR - CDR', category = 'SERVICE - Speed of Service' } = req.body;
    const dbInstance = db.getDb();
    
    logger.info(`[Admin] Updating Speed of Service - Template: "${templateName}", Category: "${category}"`);
    
    // Curated items from user's requirements
    const ITEMS = [
      { title: 'If there was NO queue, were customers greeted within 10 seconds / acceptable time', yesMark: '3' },
      { title: 'If there was a queue, were customers greeted within 20 seconds / acceptable time', yesMark: '3' },
      { title: 'If there was a queue, were you quoted an accurate wait time and provided a menu?', yesMark: '3' },
      { title: 'Server offered to take the order within 2 minutes of your having been seated or buzzed', yesMark: '3' },
      { title: 'Was the complete food order served in a timely manner?', yesMark: '0', isHeader: true },
      { title: '- Straight Drinks on time (3-4 mins)', yesMark: '3' },
      { title: '- Cocktails / Mocktails on time (5-8 mins)', yesMark: '3' },
      { title: '- Starter on time (15-20 mins)', yesMark: '3' },
      { title: '- Mains on time (15-20 mins)', yesMark: '3' },
      { title: '- Desserts on time (10 mins)', yesMark: '3' },
      { title: 'Station holder checked for the feedback within 3 mins of starters being served', yesMark: '3' },
      { title: 'Manager on duty checked for the feedback within 4 mins of main course being served', yesMark: '3' },
      { title: 'Dishes cleared within 7 minutes of guests finishing their meals or as required during the meal', yesMark: '3' },
      { title: 'Bill promptly presented within 4 mins of requesting', yesMark: '3' },
      { title: 'Staff took the payment at the table and returned with change or receipt within 5 minutes', yesMark: '3' },
      { title: 'Vacated tables cleared and cleaned within 4 minutes', yesMark: '2' },
    ];
    
    // Find template
    const template = await dbInstance.get('SELECT id, name FROM checklist_templates WHERE name = ?', [templateName]);
    if (!template) {
      return res.status(404).json({ error: `Template not found: ${templateName}` });
    }
    
    const templateId = template.id;
    logger.info(`[Admin] Found template: ${template.name} (ID: ${templateId})`);
    
    // Get existing items in this category
    const existing = await dbInstance.all(
      'SELECT id FROM checklist_items WHERE template_id = ? AND category = ?',
      [templateId, category]
    );
    
    // Delete existing items and their options
    for (const item of existing) {
      await dbInstance.run('DELETE FROM checklist_item_options WHERE item_id = ?', [item.id]);
      await dbInstance.run('DELETE FROM checklist_items WHERE id = ?', [item.id]);
    }
    logger.info(`[Admin] Deleted ${existing.length} existing items`);
    
    // Insert new items
    let insertedCount = 0;
    for (let i = 0; i < ITEMS.length; i++) {
      const item = ITEMS[i];
      
      const result = await dbInstance.run(
        `INSERT INTO checklist_items 
         (template_id, title, description, category, required, order_index, input_type, weight, is_critical)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [templateId, item.title, '', category, 1, i, 'option_select', 1, 0]
      );
      
      const itemId = result.lastID;
      if (itemId) {
        // Insert options
        await dbInstance.run(
          'INSERT INTO checklist_item_options (item_id, option_text, mark, order_index) VALUES (?, ?, ?, ?)',
          [itemId, 'Yes', item.yesMark, 0]
        );
        await dbInstance.run(
          'INSERT INTO checklist_item_options (item_id, option_text, mark, order_index) VALUES (?, ?, ?, ?)',
          [itemId, 'No', '0', 1]
        );
        await dbInstance.run(
          'INSERT INTO checklist_item_options (item_id, option_text, mark, order_index) VALUES (?, ?, ?, ?)',
          [itemId, 'N/A', 'NA', 2]
        );
        insertedCount++;
      }
    }
    
    logger.info(`[Admin] Inserted ${insertedCount} items`);
    
    res.json({
      success: true,
      message: `Updated ${category} in template "${templateName}"`,
      deletedItems: existing.length,
      insertedItems: insertedCount,
      perfectScore: 44
    });
    
  } catch (error) {
    logger.error('[Admin] Error updating Speed of Service:', error);
    res.status(500).json({ error: 'Failed to update', details: error.message });
  }
});

module.exports = router;

