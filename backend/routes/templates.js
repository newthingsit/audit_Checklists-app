const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all templates (public endpoint for template selection)
router.get('/', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const dbType = process.env.DB_TYPE || 'sqlite';
  
  // SQL Server requires all non-aggregated columns in GROUP BY
  // TEXT/NTEXT columns cannot be used in GROUP BY/ORDER BY, so we need to CAST them
  let query;
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    query = `SELECT ct.id, ct.name, ct.category, 
     CAST(ct.description AS NVARCHAR(MAX)) as description, 
     ct.created_by, ct.created_at,
     COUNT(ci.id) as item_count,
     u.name as created_by_name
     FROM checklist_templates ct
     LEFT JOIN checklist_items ci ON ct.id = ci.template_id
     LEFT JOIN users u ON ct.created_by = u.id
     GROUP BY ct.id, ct.name, ct.category, CAST(ct.description AS NVARCHAR(MAX)), ct.created_by, ct.created_at, u.name
     ORDER BY ct.created_at DESC`;
  } else {
    query = `SELECT ct.*, 
     COUNT(ci.id) as item_count,
     u.name as created_by_name
     FROM checklist_templates ct
     LEFT JOIN checklist_items ci ON ct.id = ci.template_id
     LEFT JOIN users u ON ct.created_by = u.id
     GROUP BY ct.id
     ORDER BY ct.created_at DESC`;
  }
  
  dbInstance.all(query, [], (err, templates) => {
    if (err) {
      console.error('Templates error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json({ templates });
  });
});

module.exports = router;

