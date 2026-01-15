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

// Admin endpoint to update Speed of Service TRACKING category items
// POST /api/templates/admin/update-speed-of-service
router.post('/admin/update-speed-of-service', authenticate, async (req, res) => {
  try {
    // Only allow admin users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { templateName = 'CVR - CDR', category = 'SPEED OF SERVICE – TRACKING' } = req.body;
    const dbInstance = db.getDb();
    
    logger.info(`[Admin] Updating Speed of Service Tracking - Template: "${templateName}", Category: "${category}"`);
    
    // Define the tracking items for each transaction section
    const TRACKING_FIELDS = [
      { title: 'Table no.', inputType: 'number', required: true },
      { title: 'Greeted (No Queue) (Time)', inputType: 'date', required: false },
      { title: 'Greeted (No Queue) (Sec)', inputType: 'number', required: false },
      { title: 'Greeted (with Queue) (Time)', inputType: 'date', required: false },
      { title: 'Greeted (with Queue) (Sec)', inputType: 'number', required: false },
      { title: 'Order taker approached (Time)', inputType: 'date', required: false },
      { title: 'Order taker approached (Sec)', inputType: 'number', required: false },
      { title: 'Order taking time (Time)', inputType: 'date', required: false },
      { title: 'Order taking time (Sec)', inputType: 'number', required: false },
      { title: 'Straight Drinks served (Time)', inputType: 'date', required: false },
      { title: 'Straight Drinks served (Sec)', inputType: 'number', required: false },
      { title: 'Cocktails / Mocktails served (Time)', inputType: 'date', required: false },
      { title: 'Cocktails / Mocktails served (Sec)', inputType: 'number', required: false },
      { title: 'Starters served (Time)', inputType: 'date', required: false },
      { title: 'Starters served (Sec)', inputType: 'number', required: false },
      { title: 'Main Course served (no starters) (Time)', inputType: 'date', required: false },
      { title: 'Main Course served (no starters) (Sec)', inputType: 'number', required: false },
      { title: 'Main Course served (after starters) (Time)', inputType: 'date', required: false },
      { title: 'Main Course served (after starters) (Sec)', inputType: 'number', required: false },
      { title: 'Captain / F&B Exe. follow-up after starter (Time)', inputType: 'date', required: false },
      { title: 'Captain / F&B Exe. follow-up after starter (Sec)', inputType: 'number', required: false },
      { title: 'Manager follow-up after mains (Time)', inputType: 'date', required: false },
      { title: 'Manager follow-up after mains (Sec)', inputType: 'number', required: false },
      { title: 'Dishes cleared (Time)', inputType: 'date', required: false },
      { title: 'Dishes cleared (Sec)', inputType: 'number', required: false },
      { title: 'Bill presented (Time)', inputType: 'date', required: false },
      { title: 'Bill presented (Sec)', inputType: 'number', required: false },
      { title: 'Receipt & change given (Time)', inputType: 'date', required: false },
      { title: 'Receipt & change given (Sec)', inputType: 'number', required: false },
      { title: 'Tables cleared, cleaned & set back (Time)', inputType: 'date', required: false },
      { title: 'Tables cleared, cleaned & set back (Sec)', inputType: 'number', required: false },
    ];
    
    // Average fields (only Sec fields)
    const AVG_FIELDS = [
      { title: 'Table no.', inputType: 'number', required: false },
      { title: 'Greeted (with Queue) (Sec)', inputType: 'number', required: false },
      { title: 'Greeted (No Queue) (Sec)', inputType: 'number', required: false },
      { title: 'Order taker approached (Sec)', inputType: 'number', required: false },
      { title: 'Order taking time (Sec)', inputType: 'number', required: false },
      { title: 'Straight Drinks served (Sec)', inputType: 'number', required: false },
      { title: 'Cocktails / Mocktails served (Sec)', inputType: 'number', required: false },
      { title: 'Starters served (Sec)', inputType: 'number', required: false },
      { title: 'Main Course served (no starters) (Sec)', inputType: 'number', required: false },
      { title: 'Main Course served (after starters) (Sec)', inputType: 'number', required: false },
      { title: 'Captain / F&B Exe. follow-up after starter (Sec)', inputType: 'number', required: false },
      { title: 'Manager follow-up after mains (Sec)', inputType: 'number', required: false },
      { title: 'Dishes cleared (Sec)', inputType: 'number', required: false },
      { title: 'Bill presented (Sec)', inputType: 'number', required: false },
      { title: 'Receipt & change given (Sec)', inputType: 'number', required: false },
      { title: 'Tables cleared, cleaned & set back (Sec)', inputType: 'number', required: false },
    ];
    
    // Sections: Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg
    const SECTIONS = ['Trnx-1', 'Trnx-2', 'Trnx-3', 'Trnx-4', 'Avg'];
    
    // Find template
    const template = await dbInstance.get('SELECT id, name FROM checklist_templates WHERE name = ?', [templateName]);
    if (!template) {
      return res.status(404).json({ error: `Template not found: ${templateName}` });
    }
    
    const templateId = template.id;
    logger.info(`[Admin] Found template: ${template.name} (ID: ${templateId})`);
    
    // Get existing items in this category (including sectioned categories like "CATEGORY|Trnx-1")
    const existing = await dbInstance.all(
      `SELECT id FROM checklist_items WHERE template_id = ? AND (category = ? OR category LIKE ?)`,
      [templateId, category, `${category}|%`]
    );
    
    // Delete existing items and their options
    for (const item of existing) {
      await dbInstance.run('DELETE FROM checklist_item_options WHERE item_id = ?', [item.id]);
      await dbInstance.run('DELETE FROM checklist_items WHERE id = ?', [item.id]);
    }
    logger.info(`[Admin] Deleted ${existing.length} existing items from category "${category}" and sub-sections`);
    
    // Insert new items for each section
    let insertedCount = 0;
    let orderIndex = 0;
    
    for (const section of SECTIONS) {
      const fields = section === 'Avg' ? AVG_FIELDS : TRACKING_FIELDS;
      
      for (const field of fields) {
        // Use the section field properly instead of appending to category
        const result = await dbInstance.run(
          `INSERT INTO checklist_items 
           (template_id, title, description, category, section, required, order_index, input_type, weight, is_critical)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            templateId,
            field.title,
            '',
            category,      // Main category: "SPEED OF SERVICE - TRACKING"
            section,       // Section: "Trnx-1", "Trnx-2", etc.
            field.required ? 1 : 0,
            orderIndex,
            field.inputType,
            1,
            0
          ]
        );
        
        if (result.lastID) {
          insertedCount++;
        }
        orderIndex++;
      }
    }
    
    logger.info(`[Admin] Inserted ${insertedCount} tracking items`);
    
    res.json({
      success: true,
      message: `Updated ${category} in template "${templateName}"`,
      deletedItems: existing.length,
      insertedItems: insertedCount,
      sections: SECTIONS
    });
    
  } catch (error) {
    logger.error('[Admin] Error updating Speed of Service Tracking:', error);
    res.status(500).json({ error: 'Failed to update', details: error.message });
  }
});

module.exports = router;

