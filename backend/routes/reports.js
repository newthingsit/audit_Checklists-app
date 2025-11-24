const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Helper function to check if user is admin
const isAdminUser = (user) => {
  if (!user) return false;
  const role = user.role ? user.role.toLowerCase() : '';
  return role === 'admin' || role === 'superadmin';
};

// Export audit to PDF (admins can export any audit)
router.get('/audit/:id/pdf', authenticate, (req, res) => {
  const auditId = req.params.id;
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const dbInstance = db.getDb();

  const whereClause = isAdmin ? 'WHERE a.id = ?' : 'WHERE a.id = ? AND a.user_id = ?';
  const params = isAdmin ? [auditId] : [auditId, userId];

  dbInstance.get(
    `SELECT a.*, ct.name as template_name, ct.category, u.name as user_name
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN users u ON a.user_id = u.id
     ${whereClause}`,
    params,
    (err, audit) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!audit) {
        return res.status(404).json({ error: 'Audit not found' });
      }

      dbInstance.all(
        `SELECT ai.*, ci.title, ci.description, ci.category, ci.required
         FROM audit_items ai
         JOIN checklist_items ci ON ai.item_id = ci.id
         WHERE ai.audit_id = ?
         ORDER BY ci.order_index, ci.id`,
        [auditId],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Create PDF
          const doc = new PDFDocument({ margin: 50 });
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename=audit-${auditId}.pdf`);
          doc.pipe(res);

          // Header
          doc.fontSize(20).text('Restaurant Audit Report', { align: 'center' });
          doc.moveDown();

          // Audit Information
          doc.fontSize(14).text('Audit Information', { underline: true });
          doc.fontSize(12);
          doc.text(`Restaurant: ${audit.restaurant_name}`);
          doc.text(`Location: ${audit.location || 'N/A'}`);
          doc.text(`Template: ${audit.template_name}`);
          doc.text(`Auditor: ${audit.user_name}`);
          doc.text(`Date: ${new Date(audit.created_at).toLocaleDateString()}`);
          doc.text(`Status: ${audit.status}`);
          if (audit.score !== null) {
            doc.text(`Score: ${audit.score}%`);
          }
          doc.moveDown();

          // Notes
          if (audit.notes) {
            doc.fontSize(14).text('Notes', { underline: true });
            doc.fontSize(12).text(audit.notes);
            doc.moveDown();
          }

          // Checklist Items
          doc.fontSize(14).text('Checklist Items', { underline: true });
          doc.moveDown(0.5);

          items.forEach((item, index) => {
            doc.fontSize(12);
            doc.text(`${index + 1}. ${item.title}`, { continued: false });
            doc.fontSize(10).fillColor('gray');
            doc.text(`   Status: ${item.status} | Category: ${item.category}`);
            if (item.description) {
              doc.text(`   ${item.description}`);
            }
            if (item.comment) {
              doc.fillColor('blue');
              doc.text(`   Comment: ${item.comment}`);
            }
            doc.fillColor('black');
            doc.moveDown(0.5);
          });

          doc.end();
        }
      );
    }
  );
});

// Export audits to CSV (admins see all audits, supports filtering)
router.get('/audits/csv', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { ids } = req.query; // Optional: comma-separated audit IDs
  const dbInstance = db.getDb();

  // Get all unique categories from checklist items (comma-separated)
  // Also get scheduled_date if audit was created from a scheduled audit
  const dbType = process.env.DB_TYPE || 'sqlite';
  let categorySubquery;
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    // SQL Server: Use STUFF with FOR XML PATH for better compatibility
    categorySubquery = `(SELECT STUFF((SELECT DISTINCT N',' + category 
                        FROM checklist_items 
                        WHERE template_id = ct.id AND category IS NOT NULL AND category != N''
                        FOR XML PATH(N''), TYPE).value(N'.', N'NVARCHAR(MAX)'), 1, 1, N''))`;
  } else if (dbType === 'mysql') {
    // MySQL: Use GROUP_CONCAT to combine categories
    categorySubquery = `(SELECT GROUP_CONCAT(DISTINCT ci.category SEPARATOR ', ') 
                        FROM checklist_items ci 
                        WHERE ci.template_id = ct.id AND ci.category IS NOT NULL AND ci.category != '')`;
  } else if (dbType === 'postgres' || dbType === 'postgresql') {
    // PostgreSQL: Use STRING_AGG to combine categories
    categorySubquery = `(SELECT STRING_AGG(DISTINCT ci.category, ', ') 
                        FROM checklist_items ci 
                        WHERE ci.template_id = ct.id AND ci.category IS NOT NULL AND ci.category != '')`;
  } else {
    // SQLite: Use GROUP_CONCAT (SQLite 3.5.0+)
    categorySubquery = `(SELECT GROUP_CONCAT(DISTINCT ci.category, ', ') 
                        FROM checklist_items ci 
                        WHERE ci.template_id = ct.id AND ci.category IS NOT NULL AND ci.category != '')`;
  }
  
  // Use ISNULL for SQL Server, COALESCE for others
  const categorySelect = (dbType === 'mssql' || dbType === 'sqlserver')
    ? `ISNULL(NULLIF(ct.category, N''), ISNULL(${categorySubquery}, N''))`
    : `COALESCE(NULLIF(ct.category, ''), ${categorySubquery}, '')`;
  
  let query = `SELECT a.id, a.restaurant_name, a.location, a.status, a.score, 
     a.completed_items, a.total_items, ct.name as template_name, 
     ${categorySelect} as template_category,
     a.created_at, a.completed_at, a.scheduled_audit_id,
     COALESCE(sa.scheduled_date, a.created_at) as audit_date,
     u.name as user_name, u.email as user_email,
     l.store_number as location_store_number
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN users u ON a.user_id = u.id
     LEFT JOIN locations l ON a.location_id = l.id
     LEFT JOIN scheduled_audits sa ON a.scheduled_audit_id = sa.id`;
  
  let params = [];
  
  // If specific IDs are requested, use them
  if (ids) {
    const auditIds = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (auditIds.length > 0) {
      const placeholders = auditIds.map(() => '?').join(',');
      query += ` WHERE a.id IN (${placeholders})`;
      params = auditIds;
    } else {
      return res.status(400).json({ error: 'Invalid audit IDs' });
    }
  } else {
    // Otherwise, filter by user (or show all for admins)
    if (isAdmin) {
      query += ` WHERE 1=1`;
    } else {
      query += ` WHERE a.user_id = ?`;
      params = [userId];
    }
  }
  
  query += ` ORDER BY a.created_at DESC`;

  dbInstance.all(query, params,
    (err, audits) => {
      if (err) {
        console.error('Database error in CSV export:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      // Debug: Log first audit to check category field
      if (audits && audits.length > 0) {
        console.log('Sample audit data:', {
          id: audits[0].id,
          template_name: audits[0].template_name,
          template_category: audits[0].template_category
        });
      }

      try {
        // Helper function to format date to India time (IST - UTC+5:30) - Date only
        const formatIndiaDate = (dateString) => {
          if (!dateString) return '';
          try {
            const date = new Date(dateString);
            // Convert to IST (UTC+5:30)
            // Get UTC time in milliseconds
            const utcTime = date.getTime();
            // IST is UTC+5:30 = 5.5 hours = 19800000 milliseconds
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istTime = new Date(utcTime + istOffset);
            
            // Format as DD-MM-YYYY (date only, no time)
            const day = String(istTime.getUTCDate()).padStart(2, '0');
            const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
            const year = istTime.getUTCFullYear();
            
            return `${day}-${month}-${year}`;
          } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
          }
        };

        // Helper function to extract store number from location string or use location store_number
        const getStoreNumber = (audit) => {
          if (audit.location_store_number) {
            return audit.location_store_number;
          }
          // Extract store number from location string like "Store 5541"
          if (audit.location) {
            const match = audit.location.match(/Store\s*#?\s*(\d+)/i) || audit.location.match(/(\d+)/);
            if (match && match[1]) {
              return match[1];
            }
            return audit.location;
          }
          return '';
        };

        // Generate CSV header
        const headers = [
          'ID',
          'Restaurant Name',
          'Store Number',
          'Template',
          'Category',
          'Status',
          'Score (%)',
          'Completed Items',
          'Total Items',
          'Audit By Name',
          'Audit By Email',
          'Created Date',
          'Completed Date'
        ];

        // Generate CSV rows
        const rows = audits.map(audit => {
          const storeNumber = getStoreNumber(audit);
          const row = [
            audit.id,
            `"${(audit.restaurant_name || '').replace(/"/g, '""')}"`,
            storeNumber ? `"${String(storeNumber).replace(/"/g, '""')}"` : '',
            `"${(audit.template_name || '').replace(/"/g, '""')}"`,
            `"${(audit.template_category || '').replace(/"/g, '""')}"`,
            audit.status || '',
            audit.score !== null ? audit.score : '',
            audit.completed_items || 0,
            audit.total_items || 0,
            `"${(audit.user_name || '').replace(/"/g, '""')}"`,
            `"${(audit.user_email || '').replace(/"/g, '""')}"`,
            // Use scheduled_date if available, otherwise use created_at
            formatIndiaDate(audit.audit_date || audit.created_at),
            formatIndiaDate(audit.completed_at)
          ];
          
          return row.join(',');
        });

        // Combine header and rows
        const csvContent = [
          headers.join(','),
          ...rows
        ].join('\n');

        // Set response headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audits-export.csv');
        
        // Send CSV content
        res.send(csvContent);
      } catch (error) {
        console.error('Error generating CSV:', error);
        res.status(500).json({ error: 'Error generating CSV file', details: error.message });
      }
    }
  );
});

// Export multiple audits to PDF (admins see all audits, supports filtering)
router.get('/audits/pdf', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { ids } = req.query; // Optional: comma-separated audit IDs
  const dbInstance = db.getDb();

  let query = `SELECT a.id, a.restaurant_name, a.location, a.status, a.score, 
     a.completed_items, a.total_items, ct.name as template_name,
     a.created_at, a.completed_at, u.name as user_name
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN users u ON a.user_id = u.id`;
  
  let params = [];
  
  // If specific IDs are requested, use them
  if (ids) {
    const auditIds = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (auditIds.length > 0) {
      const placeholders = auditIds.map(() => '?').join(',');
      query += ` WHERE a.id IN (${placeholders})`;
      params = auditIds;
    } else {
      return res.status(400).json({ error: 'Invalid audit IDs' });
    }
  } else {
    // Otherwise, filter by user (or show all for admins)
    if (isAdmin) {
      query += ` WHERE 1=1`;
    } else {
      query += ` WHERE a.user_id = ?`;
      params = [userId];
    }
  }
  
  query += ` ORDER BY a.created_at DESC`;

  dbInstance.all(query, params, (err, audits) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    const filename = ids ? `audits-${audits.length}-selected.pdf` : 'all-audits.pdf';
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Audit History Report', { align: 'center' });
    doc.fontSize(14).text(`Total Audits: ${audits.length}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    const completed = audits.filter(a => a.status === 'completed').length;
    const inProgress = audits.filter(a => a.status === 'in_progress').length;
    const scores = audits.filter(a => a.score !== null).map(a => a.score);
    const avgScore = scores.length > 0 
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 
      : 0;

    doc.fontSize(16).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Audits: ${audits.length}`);
    doc.text(`Completed: ${completed}`);
    doc.text(`In Progress: ${inProgress}`);
    doc.text(`Average Score: ${avgScore}%`);
    doc.moveDown();

    // Audit Details
    doc.fontSize(16).text('Audit Details', { underline: true });
    doc.moveDown(0.5);

    audits.forEach((audit, index) => {
      doc.fontSize(11);
      doc.text(`${index + 1}. ${audit.restaurant_name}`, { continued: false });
      doc.fontSize(10).fillColor('gray');
      doc.text(`   Location: ${audit.location || 'N/A'} | Template: ${audit.template_name}`);
      if (isAdmin && audit.user_name) {
        doc.text(`   Created By: ${audit.user_name}`);
      }
      doc.text(`   Status: ${audit.status} | Score: ${audit.score !== null ? audit.score + '%' : 'N/A'}`);
      doc.text(`   Items: ${audit.completed_items || 0}/${audit.total_items || 0} completed`);
      doc.text(`   Date: ${new Date(audit.created_at).toLocaleDateString()}`);
      if (audit.completed_at) {
        doc.text(`   Completed: ${new Date(audit.completed_at).toLocaleDateString()}`);
      }
      doc.fillColor('black');
      doc.moveDown(0.5);
    });

    doc.end();
  });
});

// Get monthly scorecard report (admins see all audits)
router.get('/monthly-scorecard', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { year, month, location_id } = req.query;
  const dbInstance = db.getDb();

  // Default to current month if not specified
  const reportYear = year || new Date().getFullYear();
  const reportMonth = month || (new Date().getMonth() + 1);
  
  // Pad month with leading zero for SQLite strftime comparison
  const monthPadded = String(reportMonth).padStart(2, '0');
  const yearStr = String(reportYear);

  // Build query with optional location filter
  let locationFilter = '';
  let params = [];
  
  // Build WHERE clause - admins see all audits
  if (isAdmin) {
    params = [yearStr, monthPadded];
  } else {
    params = [userId, yearStr, monthPadded];
  }
  
  if (location_id) {
    locationFilter = 'AND a.location_id = ?';
    params.push(location_id);
  }

  // Get all audits for the month
  const dbType = process.env.DB_TYPE || 'sqlite';
  let dateQuery;
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    dateQuery = `YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
  } else if (dbType === 'mysql') {
    dateQuery = `YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
  } else {
    // SQLite and PostgreSQL
    dateQuery = `strftime('%Y', a.created_at) = ? AND strftime('%m', a.created_at) = ?`;
  }
  
  const whereClause = isAdmin 
    ? `WHERE ${dateQuery}`
    : `WHERE a.user_id = ? AND ${dateQuery}`;
  
  dbInstance.all(
    `SELECT a.*, ct.name as template_name, ct.category, l.name as location_name, u.name as user_name
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN locations l ON a.location_id = l.id
     LEFT JOIN users u ON a.user_id = u.id
     ${whereClause}
     ${locationFilter}
     ORDER BY a.created_at DESC`,
    params,
    (err, audits) => {
      if (err) {
        console.error('Monthly scorecard error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      // Calculate statistics
      const totalAudits = audits.length;
      const completedAudits = audits.filter(a => a.status === 'completed').length;
      const inProgressAudits = audits.filter(a => a.status === 'in_progress').length;
      
      const scores = audits.filter(a => a.score !== null).map(a => a.score);
      const avgScore = scores.length > 0 
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 
        : 0;
      
      const minScore = scores.length > 0 ? Math.min(...scores) : 0;
      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

      // Group by template
      const byTemplate = {};
      audits.forEach(audit => {
        if (!byTemplate[audit.template_name]) {
          byTemplate[audit.template_name] = {
            template_name: audit.template_name,
            count: 0,
            completed: 0,
            avgScore: 0,
            scores: []
          };
        }
        byTemplate[audit.template_name].count++;
        if (audit.status === 'completed') {
          byTemplate[audit.template_name].completed++;
        }
        if (audit.score !== null) {
          byTemplate[audit.template_name].scores.push(audit.score);
        }
      });

      // Calculate average scores per template
      Object.keys(byTemplate).forEach(template => {
        const templateData = byTemplate[template];
        if (templateData.scores.length > 0) {
          templateData.avgScore = Math.round(
            (templateData.scores.reduce((a, b) => a + b, 0) / templateData.scores.length) * 100
          ) / 100;
        }
      });

      // Group by location
      const byLocation = {};
      audits.forEach(audit => {
        const locationName = audit.location_name || 'Unspecified';
        if (!byLocation[locationName]) {
          byLocation[locationName] = {
            location_name: locationName,
            count: 0,
            completed: 0,
            avgScore: 0,
            scores: []
          };
        }
        byLocation[locationName].count++;
        if (audit.status === 'completed') {
          byLocation[locationName].completed++;
        }
        if (audit.score !== null) {
          byLocation[locationName].scores.push(audit.score);
        }
      });

      // Calculate average scores per location
      Object.keys(byLocation).forEach(location => {
        const locationData = byLocation[location];
        if (locationData.scores.length > 0) {
          locationData.avgScore = Math.round(
            (locationData.scores.reduce((a, b) => a + b, 0) / locationData.scores.length) * 100
          ) / 100;
        }
      });

      // Daily breakdown
      const dailyBreakdown = {};
      audits.forEach(audit => {
        const date = new Date(audit.created_at).toISOString().split('T')[0];
        if (!dailyBreakdown[date]) {
          dailyBreakdown[date] = {
            date,
            count: 0,
            completed: 0,
            avgScore: 0,
            scores: []
          };
        }
        dailyBreakdown[date].count++;
        if (audit.status === 'completed') {
          dailyBreakdown[date].completed++;
        }
        if (audit.score !== null) {
          dailyBreakdown[date].scores.push(audit.score);
        }
      });

      // Calculate average scores per day
      Object.keys(dailyBreakdown).forEach(date => {
        const dayData = dailyBreakdown[date];
        if (dayData.scores.length > 0) {
          dayData.avgScore = Math.round(
            (dayData.scores.reduce((a, b) => a + b, 0) / dayData.scores.length) * 100
          ) / 100;
        }
      });

      res.json({
        period: {
          year: parseInt(reportYear),
          month: parseInt(reportMonth),
          monthName: new Date(reportYear, reportMonth - 1, 1).toLocaleString('default', { month: 'long' })
        },
        summary: {
          totalAudits,
          completedAudits,
          inProgressAudits,
          avgScore,
          minScore,
          maxScore,
          completionRate: totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0
        },
        byTemplate: Object.values(byTemplate),
        byLocation: Object.values(byLocation),
        dailyBreakdown: Object.values(dailyBreakdown).sort((a, b) => a.date.localeCompare(b.date)),
        audits: audits.map(a => ({
          id: a.id,
          restaurant_name: a.restaurant_name,
          location_name: a.location_name,
          template_name: a.template_name,
          status: a.status,
          score: a.score,
          created_at: a.created_at
        }))
      });
    }
  );
});

// Export monthly scorecard to PDF
router.get('/monthly-scorecard/pdf', authenticate, (req, res) => {
  const userId = req.user.id;
  const { year, month, location_id } = req.query;
  const dbInstance = db.getDb();

  // Default to current month if not specified
  const reportYear = year || new Date().getFullYear();
  const reportMonth = month || (new Date().getMonth() + 1);
  const monthName = new Date(reportYear, reportMonth - 1, 1).toLocaleString('default', { month: 'long' });
  
  // Pad month with leading zero for SQLite strftime comparison
  const monthPadded = String(reportMonth).padStart(2, '0');
  const yearStr = String(reportYear);

  // Build query with optional location filter
  let locationFilter = '';
  let params = [];
  
  // Build WHERE clause - admins see all audits
  if (isAdmin) {
    params = [yearStr, monthPadded];
  } else {
    params = [userId, yearStr, monthPadded];
  }
  
  if (location_id) {
    locationFilter = 'AND a.location_id = ?';
    params.push(location_id);
  }

  const dbType = process.env.DB_TYPE || 'sqlite';
  let dateQuery;
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    dateQuery = `YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
  } else if (dbType === 'mysql') {
    dateQuery = `YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
  } else {
    dateQuery = `strftime('%Y', a.created_at) = ? AND strftime('%m', a.created_at) = ?`;
  }
  
  const whereClause = isAdmin 
    ? `WHERE ${dateQuery}`
    : `WHERE a.user_id = ? AND ${dateQuery}`;
  
  dbInstance.all(
    `SELECT a.*, ct.name as template_name, ct.category, l.name as location_name, u.name as user_name
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN locations l ON a.location_id = l.id
     LEFT JOIN users u ON a.user_id = u.id
     ${whereClause}
     ${locationFilter}
     ORDER BY a.created_at DESC`,
    params,
    (err, audits) => {
      if (err) {
        console.error('Monthly scorecard PDF error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      // Calculate statistics
      const totalAudits = audits.length;
      const completedAudits = audits.filter(a => a.status === 'completed').length;
      const scores = audits.filter(a => a.score !== null).map(a => a.score);
      const avgScore = scores.length > 0 
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 
        : 0;

      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=monthly-scorecard-${reportYear}-${String(reportMonth).padStart(2, '0')}.pdf`);
      doc.pipe(res);

      // Header
      doc.fontSize(24).text('Monthly Scorecard Report', { align: 'center' });
      doc.fontSize(16).text(`${monthName} ${reportYear}`, { align: 'center' });
      doc.moveDown(2);

      // Summary
      doc.fontSize(18).text('Summary', { underline: true });
      doc.fontSize(12);
      doc.text(`Total Audits: ${totalAudits}`);
      doc.text(`Completed Audits: ${completedAudits}`);
      doc.text(`Completion Rate: ${totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0}%`);
      doc.text(`Average Score: ${avgScore}%`);
      doc.moveDown();

      // Audit Details
      doc.fontSize(18).text('Audit Details', { underline: true });
      doc.moveDown(0.5);

      audits.forEach((audit, index) => {
        doc.fontSize(11);
        doc.text(`${index + 1}. ${audit.restaurant_name}`, { continued: false });
        doc.fontSize(10).fillColor('gray');
        doc.text(`   Location: ${audit.location_name || 'N/A'} | Template: ${audit.template_name}`);
        doc.text(`   Status: ${audit.status} | Score: ${audit.score !== null ? audit.score + '%' : 'N/A'}`);
        doc.text(`   Date: ${new Date(audit.created_at).toLocaleDateString()}`);
        doc.fillColor('black');
        doc.moveDown(0.5);
      });

      doc.end();
    }
  );
});

// Export scheduled audits report to PDF
router.get('/scheduled-audits/pdf', authenticate, (req, res) => {
  const userId = req.user.id;
  const { date_from, date_to, location_id, template_id } = req.query;
  const dbInstance = db.getDb();

  let query = `SELECT sa.*, ct.name as template_name, l.name as location_name, u.name as assigned_to_name
     FROM scheduled_audits sa
     JOIN checklist_templates ct ON sa.template_id = ct.id
     LEFT JOIN locations l ON sa.location_id = l.id
     LEFT JOIN users u ON sa.assigned_to = u.id
     WHERE sa.created_by = ?`;
  
  const params = [userId];

  const dbType = process.env.DB_TYPE || 'sqlite';
  if (date_from) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(sa.scheduled_date AS DATE) >= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(sa.scheduled_date) >= ?';
    }
    params.push(date_from);
  }
  if (date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(sa.scheduled_date AS DATE) <= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(sa.scheduled_date) <= ?';
    }
    params.push(date_to);
  }
  if (location_id) {
    query += ' AND sa.location_id = ?';
    params.push(location_id);
  }
  if (template_id) {
    query += ' AND sa.template_id = ?';
    params.push(template_id);
  }

  query += ' ORDER BY sa.scheduled_date ASC';

  dbInstance.all(query, params, (err, schedules) => {
    if (err) {
      console.error('Scheduled audits PDF error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    const dateRange = date_from && date_to 
      ? `${date_from} to ${date_to}`
      : 'All Time';
    res.setHeader('Content-Disposition', `attachment; filename=scheduled-audits-report-${dateRange.replace(/\s+/g, '-')}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).text('Scheduled Audits Report', { align: 'center' });
    doc.fontSize(16).text(dateRange, { align: 'center' });
    doc.moveDown(2);

    // Summary
    const totalSchedules = schedules.length;
    const completed = schedules.filter(s => s.status === 'completed').length;
    const pending = schedules.filter(s => (s.status || 'pending') === 'pending').length;

    doc.fontSize(18).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Scheduled Audits: ${totalSchedules}`);
    doc.text(`Completed: ${completed}`);
    doc.text(`Pending: ${pending}`);
    doc.moveDown();

    // Schedule Details
    doc.fontSize(18).text('Schedule Details', { underline: true });
    doc.moveDown(0.5);

    schedules.forEach((schedule, index) => {
      doc.fontSize(11);
      doc.text(`${index + 1}. ${schedule.template_name}`, { continued: false });
      doc.fontSize(10).fillColor('gray');
      doc.text(`   Location: ${schedule.location_name || 'N/A'} | Assigned: ${schedule.assigned_to_name || 'Unassigned'}`);
      doc.text(`   Scheduled Date: ${new Date(schedule.scheduled_date).toLocaleDateString()}`);
      doc.text(`   Frequency: ${schedule.frequency} | Status: ${schedule.status || 'pending'}`);
      if (schedule.next_run_date) {
        doc.text(`   Next Run: ${new Date(schedule.next_run_date).toLocaleDateString()}`);
      }
      doc.fillColor('black');
      doc.moveDown(0.5);
    });

    doc.end();
  });
});

// Export scheduled audits report to CSV
router.get('/scheduled-audits/csv', authenticate, (req, res) => {
  const userId = req.user.id;
  const { date_from, date_to, location_id, template_id } = req.query;
  const dbInstance = db.getDb();

  let query = `SELECT sa.*, ct.name as template_name, l.name as location_name, u.name as assigned_to_name
     FROM scheduled_audits sa
     JOIN checklist_templates ct ON sa.template_id = ct.id
     LEFT JOIN locations l ON sa.location_id = l.id
     LEFT JOIN users u ON sa.assigned_to = u.id
     WHERE sa.created_by = ?`;
  
  const params = [userId];

  const dbType = process.env.DB_TYPE || 'sqlite';
  if (date_from) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(sa.scheduled_date AS DATE) >= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(sa.scheduled_date) >= ?';
    }
    params.push(date_from);
  }
  if (date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(sa.scheduled_date AS DATE) <= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(sa.scheduled_date) <= ?';
    }
    params.push(date_to);
  }
  if (location_id) {
    query += ' AND sa.location_id = ?';
    params.push(location_id);
  }
  if (template_id) {
    query += ' AND sa.template_id = ?';
    params.push(template_id);
  }

  query += ' ORDER BY sa.scheduled_date ASC';

  dbInstance.all(query, params, (err, schedules) => {
    if (err) {
      console.error('Scheduled audits CSV error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    try {
      // Generate CSV header
      const headers = [
        'ID',
        'Template',
        'Location',
        'Assigned To',
        'Scheduled Date',
        'Next Run Date',
        'Frequency',
        'Status',
        'Created Date'
      ];

      // Generate CSV rows
      const rows = schedules.map(schedule => {
        const row = [
          schedule.id,
          `"${(schedule.template_name || '').replace(/"/g, '""')}"`,
          `"${(schedule.location_name || 'N/A').replace(/"/g, '""')}"`,
          `"${(schedule.assigned_to_name || 'Unassigned').replace(/"/g, '""')}"`,
          new Date(schedule.scheduled_date).toLocaleDateString(),
          schedule.next_run_date ? new Date(schedule.next_run_date).toLocaleDateString() : 'N/A',
          schedule.frequency || '',
          schedule.status || 'pending',
          new Date(schedule.created_at).toLocaleString()
        ];
        return row.join(',');
      });

      // Combine header and rows
      const csvContent = [
        headers.join(','),
        ...rows
      ].join('\n');

      // Set response headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=scheduled-audits-report.csv');
      
      // Send CSV content
      res.send(csvContent);
    } catch (error) {
      console.error('Error generating CSV:', error);
      res.status(500).json({ error: 'Error generating CSV file', details: error.message });
    }
  });
});

// Get store-based analytics report (grouped by location/store)
router.get('/analytics-by-store', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { date_from, date_to, format } = req.query; // format: 'json' or 'csv'
  const dbInstance = db.getDb();

  // Build date filter
  let dateFilter = '';
  let params = [];
  const dbType = process.env.DB_TYPE || 'sqlite';

  if (date_from && date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) >= CAST(? AS DATE) AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) >= ? AND DATE(a.created_at) <= ?';
    }
    params.push(date_from, date_to);
  } else if (date_from) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) >= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) >= ?';
    }
    params.push(date_from);
  } else if (date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) <= ?';
    }
    params.push(date_to);
  }

  // Build user filter
  const userFilter = isAdmin ? '' : 'AND a.user_id = ?';
  if (!isAdmin) {
    params.push(userId);
  }

  // Query to get all audits with location information, including scheduled audit data
  const query = `
    SELECT 
      a.id,
      a.restaurant_name,
      a.location,
      a.location_id,
      a.status,
      a.score,
      a.completed_items,
      a.total_items,
      a.created_at,
      a.completed_at,
      a.scheduled_audit_id,
      l.name as location_name,
      l.store_number,
      l.address,
      l.city,
      l.state,
      ct.id as template_id,
      ct.name as template_name,
      u.name as auditor_name,
      sa.scheduled_date
    FROM audits a
    LEFT JOIN locations l ON a.location_id = l.id
    LEFT JOIN checklist_templates ct ON a.template_id = ct.id
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN scheduled_audits sa ON a.scheduled_audit_id = sa.id
    WHERE 1=1 ${userFilter} ${dateFilter}
    ORDER BY l.store_number, l.name, a.created_at DESC
  `;

  dbInstance.all(query, params, (err, audits) => {
    if (err) {
      console.error('Store analytics error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    // Group audits by store/location AND template (one row per store-template combination)
    const storeData = {};
    
    audits.forEach(audit => {
      // Use location_id, location_name, and template_id as key to create separate rows per template
      const templateId = audit.template_id || 'unknown';
      const templateName = audit.template_name || 'Unknown Template';
      const storeKey = audit.location_id 
        ? `${audit.location_id}_${audit.location_name || audit.location || 'Unknown'}_${templateId}`
        : `text_${audit.location || 'Unknown'}_${templateId}`;
      
      if (!storeData[storeKey]) {
        storeData[storeKey] = {
          store_id: audit.location_id || null,
          store_name: audit.location_name || audit.location || 'Unknown Store',
          store_number: audit.store_number || null,
          address: audit.address || null,
          city: audit.city || null,
          state: audit.state || null,
          template_id: templateId,
          template_name: templateName,
          total_audits: 0,
          completed_audits: 0,
          in_progress_audits: 0,
          total_score: 0,
          score_count: 0,
          average_score: 0,
          min_score: null,
          max_score: null,
          total_items: 0,
          completed_items: 0,
          scheduled_dates: [], // Track scheduled dates
          completed_dates: [], // Track completed dates
          deviations: [], // Track deviations in days
          audits: []
        };
      }

      const store = storeData[storeKey];
      store.total_audits++;
      
      if (audit.status === 'completed') {
        store.completed_audits++;
      } else if (audit.status === 'in_progress') {
        store.in_progress_audits++;
      }

      if (audit.score !== null) {
        store.total_score += audit.score;
        store.score_count++;
        if (store.min_score === null || audit.score < store.min_score) {
          store.min_score = audit.score;
        }
        if (store.max_score === null || audit.score > store.max_score) {
          store.max_score = audit.score;
        }
      }

      store.total_items += audit.total_items || 0;
      store.completed_items += audit.completed_items || 0;
      
      // Track scheduled date, fallback to created_at if not available
      const scheduledDateForTracking = audit.scheduled_date || audit.created_at;
      if (scheduledDateForTracking) {
        store.scheduled_dates.push(scheduledDateForTracking);
      }
      
      // Track completed date
      if (audit.completed_at) {
        store.completed_dates.push(audit.completed_at);
      }
      
      // Calculate deviation in days
      // Use scheduled_date if available, otherwise use created_at (matching Scheduled Date column)
      // Formula: scheduled_date - completed_date (or created_date if not completed)
      // Positive = early completion, Negative = late completion
      const scheduledDateForCalc = audit.scheduled_date || audit.created_at;
      const actualDate = audit.completed_at ? new Date(audit.completed_at) : new Date(audit.created_at);
      const scheduledDateObj = new Date(scheduledDateForCalc);
      
      // Normalize dates to compare only date part (set time to 00:00:00)
      const normalizeDate = (date) => {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
      };
      
      const scheduledNormalized = normalizeDate(scheduledDateObj);
      const actualNormalized = normalizeDate(actualDate);
      
      // Calculate difference in days: scheduled_date - actual_date
      const diffTime = scheduledNormalized - actualNormalized;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      store.deviations.push(diffDays);
      
      store.audits.push({
        id: audit.id,
        restaurant_name: audit.restaurant_name,
        template_name: audit.template_name,
        status: audit.status,
        score: audit.score,
        auditor_name: audit.auditor_name,
        created_at: audit.created_at,
        completed_at: audit.completed_at,
        scheduled_date: audit.scheduled_date
      });
    });

    // Helper function to format date to India time (IST - UTC+5:30) - Date only
    const formatIndiaDate = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        const utcTime = date.getTime();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(utcTime + istOffset);
        const day = String(istTime.getUTCDate()).padStart(2, '0');
        const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
        const year = istTime.getUTCFullYear();
        return `${day}-${month}-${year}`;
      } catch (error) {
        return dateString;
      }
    };

    // Calculate averages and completion rates
    const storeAnalytics = Object.values(storeData).map(store => {
      // Average Score: Only count audits with scores, round to 2 decimal places
      store.average_score = store.score_count > 0 
        ? Math.round((store.total_score / store.score_count) * 100) / 100 
        : 0;
      
      // Completion Rate: Percentage of completed audits
      store.completion_rate = store.total_audits > 0
        ? Math.round((store.completed_audits / store.total_audits) * 100)
        : 0;
      
      // Items Completion Rate: Percentage of completed items
      store.items_completion_rate = store.total_items > 0
        ? Math.round((store.completed_items / store.total_items) * 100)
        : 0;
      
      // Min/Max Score: Only show if there are scores
      if (store.score_count === 0) {
        store.min_score = null;
        store.max_score = null;
      }
      
      // Template is already set per store-template combination
      store.template = store.template_name || '';
      
      // Get latest scheduled date, fallback to created_at if no scheduled date
      if (store.scheduled_dates.length > 0) {
        const latestScheduled = new Date(Math.max(...store.scheduled_dates.map(d => new Date(d).getTime())));
        store.scheduled_date = formatIndiaDate(latestScheduled.toISOString());
      } else {
        // Fallback to latest created_at if no scheduled dates
        if (store.audits.length > 0) {
          const latestCreated = new Date(Math.max(...store.audits.map(a => new Date(a.created_at).getTime())));
          store.scheduled_date = formatIndiaDate(latestCreated.toISOString());
        } else {
          store.scheduled_date = '';
        }
      }
      
      // Get latest completed date
      if (store.completed_dates.length > 0) {
        const latestCompleted = new Date(Math.max(...store.completed_dates.map(d => new Date(d).getTime())));
        store.completed_date = formatIndiaDate(latestCompleted.toISOString());
      } else {
        store.completed_date = '';
      }
      
      // Calculate average deviation
      if (store.deviations.length > 0) {
        const sum = store.deviations.reduce((a, b) => a + b, 0);
        store.avg_deviation = Math.round((sum / store.deviations.length) * 100) / 100;
      } else {
        store.avg_deviation = '';
      }
      
      return store;
    });

    // Sort by store number, then by store name, then by template name
    storeAnalytics.sort((a, b) => {
      // First sort by store number
      if (a.store_number && b.store_number) {
        const numCompare = a.store_number.localeCompare(b.store_number);
        if (numCompare !== 0) return numCompare;
      } else if (a.store_number) return -1;
      else if (b.store_number) return 1;
      
      // Then by store name
      const nameCompare = a.store_name.localeCompare(b.store_name);
      if (nameCompare !== 0) return nameCompare;
      
      // Finally by template name
      return (a.template_name || '').localeCompare(b.template_name || '');
    });

    // Return CSV or JSON
    if (format === 'csv') {
      try {
        // CSV Headers
        const headers = [
          'Store Number',
          'Store Name',
          'Brand Name',
          'City',
          'State',
          'Template',
          'Scheduled Date',
          'Completed Date',
          'Deviation in Schedule (days)',
          'Total Audits',
          'Completed Audits',
          'In Progress Audits',
          'Average Score',
          'Min Score',
          'Max Score',
          'Completion Rate (%)',
          'Total Items',
          'Completed Items',
          'Items Completion Rate (%)'
        ];

        // CSV Rows
        const rows = storeAnalytics.map(store => {
          const row = [
            store.store_number || '',
            store.store_name || '',
            store.address || '',
            store.city || '',
            store.state || '',
            store.template || '',
            store.scheduled_date || '',
            store.completed_date || '',
            store.avg_deviation !== '' ? store.avg_deviation : '',
            store.total_audits,
            store.completed_audits,
            store.in_progress_audits,
            store.average_score,
            store.min_score !== null ? store.min_score : '',
            store.max_score !== null ? store.max_score : '',
            store.completion_rate,
            store.total_items,
            store.completed_items,
            store.items_completion_rate
          ];
          // Escape commas and quotes in CSV
          return row.map(cell => {
            const cellStr = String(cell || '');
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',');
        });

        // Combine header and rows
        const csvContent = [
          headers.join(','),
          ...rows
        ].join('\n');

        // Set response headers
        const filename = `planner-analytics-bystore-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        // Send CSV content
        res.send(csvContent);
      } catch (error) {
        console.error('Error generating CSV:', error);
        res.status(500).json({ error: 'Error generating CSV file', details: error.message });
      }
    } else {
      // Return JSON
      res.json({
        summary: {
          total_stores: storeAnalytics.length,
          total_audits: audits.length,
          date_range: {
            from: date_from || 'all',
            to: date_to || 'all'
          }
        },
        stores: storeAnalytics
      });
    }
  });
});

module.exports = router;

