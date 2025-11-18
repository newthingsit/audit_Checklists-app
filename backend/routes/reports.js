const express = require('express');
const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Export audit to PDF
router.get('/audit/:id/pdf', authenticate, (req, res) => {
  const auditId = req.params.id;
  const userId = req.user.id;
  const dbInstance = db.getDb();

  dbInstance.get(
    `SELECT a.*, ct.name as template_name, ct.category, u.name as user_name
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     JOIN users u ON a.user_id = u.id
     WHERE a.id = ? AND a.user_id = ?`,
    [auditId, userId],
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

// Export audits to CSV
router.get('/audits/csv', authenticate, (req, res) => {
  const userId = req.user.id;
  const dbInstance = db.getDb();

  dbInstance.all(
    `SELECT a.id, a.restaurant_name, a.location, a.status, a.score, 
     a.completed_items, a.total_items, ct.name as template_name,
     a.created_at, a.completed_at
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     WHERE a.user_id = ?
     ORDER BY a.created_at DESC`,
    [userId],
    (err, audits) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const csvWriter = createCsvWriter({
        path: path.join(__dirname, '../temp/audits-export.csv'),
        header: [
          { id: 'id', title: 'ID' },
          { id: 'restaurant_name', title: 'Restaurant Name' },
          { id: 'location', title: 'Location' },
          { id: 'template_name', title: 'Template' },
          { id: 'status', title: 'Status' },
          { id: 'score', title: 'Score (%)' },
          { id: 'completed_items', title: 'Completed Items' },
          { id: 'total_items', title: 'Total Items' },
          { id: 'created_at', title: 'Created Date' },
          { id: 'completed_at', title: 'Completed Date' }
        ]
      });

      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      csvWriter.writeRecords(audits.map(audit => ({
        ...audit,
        created_at: new Date(audit.created_at).toLocaleString(),
        completed_at: audit.completed_at ? new Date(audit.completed_at).toLocaleString() : ''
      })))
        .then(() => {
          res.download(csvWriter.path, 'audits-export.csv', (err) => {
            if (err) {
              console.error('Error downloading file:', err);
            }
            // Clean up temp file after a delay
            setTimeout(() => {
              if (fs.existsSync(csvWriter.path)) {
                fs.unlinkSync(csvWriter.path);
              }
            }, 5000);
          });
        })
        .catch(err => {
          console.error('Error creating CSV:', err);
          res.status(500).json({ error: 'Error creating CSV file' });
        });
    }
  );
});

// Get monthly scorecard report
router.get('/monthly-scorecard', authenticate, (req, res) => {
  const userId = req.user.id;
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
  const params = [userId, yearStr, monthPadded];
  
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
  
  dbInstance.all(
    `SELECT a.*, ct.name as template_name, ct.category, l.name as location_name
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN locations l ON a.location_id = l.id
     WHERE a.user_id = ?
       AND ${dateQuery}
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
  const params = [userId, yearStr, monthPadded];
  
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
  
  dbInstance.all(
    `SELECT a.*, ct.name as template_name, ct.category, l.name as location_name
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN locations l ON a.location_id = l.id
     WHERE a.user_id = ?
       AND ${dateQuery}
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

    const csvWriter = createCsvWriter({
      path: path.join(__dirname, '../temp/scheduled-audits-export.csv'),
      header: [
        { id: 'id', title: 'ID' },
        { id: 'template_name', title: 'Template' },
        { id: 'location_name', title: 'Location' },
        { id: 'assigned_to_name', title: 'Assigned To' },
        { id: 'scheduled_date', title: 'Scheduled Date' },
        { id: 'next_run_date', title: 'Next Run Date' },
        { id: 'frequency', title: 'Frequency' },
        { id: 'status', title: 'Status' },
        { id: 'created_at', title: 'Created Date' }
      ]
    });

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    csvWriter.writeRecords(schedules.map(schedule => ({
      id: schedule.id,
      template_name: schedule.template_name,
      location_name: schedule.location_name || 'N/A',
      assigned_to_name: schedule.assigned_to_name || 'Unassigned',
      scheduled_date: new Date(schedule.scheduled_date).toLocaleDateString(),
      next_run_date: schedule.next_run_date ? new Date(schedule.next_run_date).toLocaleDateString() : 'N/A',
      frequency: schedule.frequency,
      status: schedule.status || 'pending',
      created_at: new Date(schedule.created_at).toLocaleString()
    })))
      .then(() => {
        res.download(csvWriter.path, 'scheduled-audits-report.csv', (err) => {
          if (err) {
            console.error('Error downloading file:', err);
          }
          // Clean up temp file after a delay
          setTimeout(() => {
            if (fs.existsSync(csvWriter.path)) {
              fs.unlinkSync(csvWriter.path);
            }
          }, 5000);
        });
      })
      .catch(err => {
        console.error('Error creating CSV:', err);
        res.status(500).json({ error: 'Error creating CSV file' });
      });
  });
});

module.exports = router;

