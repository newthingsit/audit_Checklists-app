const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const normalizeTemplateKey = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const dbAll = (dbInstance, query, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

let templateIndexesEnsured = false;
const runQuerySafe = (dbInstance, query) =>
  new Promise((resolve, reject) => {
    try {
      const maybePromise = dbInstance.run(query, [], (err) => {
        if (err) return reject(err);
        resolve();
      });
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(() => resolve()).catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });

const ensureTemplateQueryIndexes = async (dbInstance, dbType) => {
  if (templateIndexesEnsured) return;
  try {
    const normalized = (dbType || '').toLowerCase();
    if (normalized === 'mssql' || normalized === 'sqlserver') {
      await runQuerySafe(dbInstance, `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_checklist_items_template_id') CREATE INDEX idx_checklist_items_template_id ON checklist_items(template_id)`).catch(() => {});
      await runQuerySafe(dbInstance, `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_checklist_items_template_category') CREATE INDEX idx_checklist_items_template_category ON checklist_items(template_id, category)`).catch(() => {});
      await runQuerySafe(dbInstance, `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_checklist_templates_created_at') CREATE INDEX idx_checklist_templates_created_at ON checklist_templates(created_at)`).catch(() => {});
    } else {
      await runQuerySafe(dbInstance, 'CREATE INDEX IF NOT EXISTS idx_checklist_items_template_id ON checklist_items(template_id)').catch(() => {});
      await runQuerySafe(dbInstance, 'CREATE INDEX IF NOT EXISTS idx_checklist_items_template_category ON checklist_items(template_id, category)').catch(() => {});
      await runQuerySafe(dbInstance, 'CREATE INDEX IF NOT EXISTS idx_checklist_templates_created_at ON checklist_templates(created_at)').catch(() => {});
    }
    templateIndexesEnsured = true;
  } catch (error) {
    logger.warn('[Templates API] Index ensure failed (continuing):', error.message);
  }
};

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
router.get('/', authenticate, async (req, res) => {
  const startedAt = Date.now();
  const dbInstance = db.getDb();
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isMssql = dbType === 'mssql' || dbType === 'sqlserver';
  const dedupe = req.query.dedupe !== 'false';

  try {
    await ensureTemplateQueryIndexes(dbInstance, dbType);

    const templatesQuery = isMssql
      ? `SELECT 
          ct.id,
          ct.name,
          ISNULL(ct.category, '') as category,
          CAST(ISNULL(ct.description, '') AS NVARCHAR(MAX)) as description,
          ct.created_by,
          ct.created_at,
          ISNULL(u.name, '') as created_by_name
        FROM checklist_templates ct
        LEFT JOIN users u ON ct.created_by = u.id
        ORDER BY ct.created_at DESC`
      : `SELECT 
          ct.*,
          u.name as created_by_name
        FROM checklist_templates ct
        LEFT JOIN users u ON ct.created_by = u.id
        ORDER BY ct.created_at DESC`;

    const templates = await dbAll(dbInstance, templatesQuery, []);
    if (!templates.length) {
      return res.status(200).json({ templates: [] });
    }

    let filteredTemplates = templates;
    if (dedupe) {
      const deduped = new Map();
      templates.forEach((template) => {
        const key = normalizeTemplateKey(template.name);
        if (!key) return;
        const existing = deduped.get(key);
        if (!existing) {
          deduped.set(key, template);
          return;
        }
        const existingDate = Date.parse(existing.created_at || '') || 0;
        const currentDate = Date.parse(template.created_at || '') || 0;
        const shouldReplace = currentDate > existingDate || (currentDate === existingDate && Number(template.id) > Number(existing.id));
        if (shouldReplace) deduped.set(key, template);
      });
      filteredTemplates = Array.from(deduped.values());
    }

    const templateIds = filteredTemplates.map((template) => template.id).filter((id) => id !== null && id !== undefined);
    if (!templateIds.length) {
      return res.status(200).json({ templates: [] });
    }

    const placeholders = templateIds.map(() => '?').join(',');
    const categoryTrimPredicate = isMssql
      ? `AND LTRIM(RTRIM(category)) != ''`
      : `AND TRIM(category) != ''`;

    const [itemCounts, categoryRows] = await Promise.all([
      dbAll(
        dbInstance,
        `SELECT template_id, COUNT(*) as item_count
         FROM checklist_items
         WHERE template_id IN (${placeholders})
         GROUP BY template_id`,
        templateIds
      ).catch(() => []),
      dbAll(
        dbInstance,
        `SELECT DISTINCT template_id, category
         FROM checklist_items
         WHERE template_id IN (${placeholders})
           AND category IS NOT NULL
           ${categoryTrimPredicate}`,
        templateIds
      ).catch(() => [])
    ]);

    const countMap = {};
    itemCounts.forEach((row) => {
      countMap[row.template_id] = Number(row.item_count) || 0;
    });

    const categoriesByTemplate = {};
    categoryRows.forEach((row) => {
      if (!row.template_id) return;
      const category = String(row.category || '').trim();
      if (!category) return;
      if (!categoriesByTemplate[row.template_id]) categoriesByTemplate[row.template_id] = [];
      if (!categoriesByTemplate[row.template_id].includes(category)) {
        categoriesByTemplate[row.template_id].push(category);
      }
    });

    const payload = filteredTemplates.map((template) => ({
      ...template,
      item_count: countMap[template.id] || 0,
      categories: categoriesByTemplate[template.id] || []
    }));

    logger.info('[Templates API] Response', {
      userId: req.user?.id || null,
      templateCount: payload.length,
      dedupe,
      elapsedMs: Date.now() - startedAt
    });

    return res.status(200).json({ templates: payload });
  } catch (error) {
    logger.error('[Templates API] Fatal error', {
      userId: req.user?.id || null,
      elapsedMs: Date.now() - startedAt,
      error: error.message
    });
    return res.status(500).json({
      error: 'Internal Server Error',
      code: 'TEMPLATES_FETCH_FAILED',
      message: 'Failed to fetch templates',
      requestId: req.requestId || null
    });
  }
});

// Admin endpoint to update Speed of Service TRACKING category items
// POST /api/templates/admin/update-speed-of-service
router.post('/admin/update-speed-of-service', authenticate, async (req, res) => {
  try {
    // Only allow admin users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { templateName = 'CVR - CDR', category = 'SERVICE (Speed of Service)' } = req.body;
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
    // Also look for items with section field set to Trnx-1, Trnx-2, etc.
    const existing = await dbInstance.all(
      `SELECT id FROM checklist_items WHERE template_id = ? AND (
        category = ? 
        OR category LIKE ?
        OR (category LIKE ? AND section IN ('Trnx-1', 'Trnx-2', 'Trnx-3', 'Trnx-4', 'Avg'))
      )`,
      [templateId, category, `${category}|%`, `%SPEED%SERVICE%TRACKING%`]
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

