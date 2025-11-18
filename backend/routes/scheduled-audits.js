const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all scheduled audits
router.get('/', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;

  dbInstance.all(
    `SELECT sa.*, ct.name as template_name, l.name as location_name, u.name as assigned_to_name
     FROM scheduled_audits sa
     JOIN checklist_templates ct ON sa.template_id = ct.id
     LEFT JOIN locations l ON sa.location_id = l.id
     LEFT JOIN users u ON sa.assigned_to = u.id
     WHERE sa.created_by = ? OR sa.assigned_to = ?
     ORDER BY sa.scheduled_date ASC`,
    [userId, userId],
    (err, schedules) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ schedules });
    }
  );
});

// Get single scheduled audit
router.get('/:id', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;

  dbInstance.get(
    `SELECT sa.*, ct.name as template_name, l.name as location_name, u.name as assigned_to_name
     FROM scheduled_audits sa
     JOIN checklist_templates ct ON sa.template_id = ct.id
     LEFT JOIN locations l ON sa.location_id = l.id
     LEFT JOIN users u ON sa.assigned_to = u.id
     WHERE sa.id = ? AND (sa.created_by = ? OR sa.assigned_to = ?)`,
    [req.params.id, userId, userId],
    (err, schedule) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      res.json({ schedule });
    }
  );
});

// Create scheduled audit
router.post('/', authenticate, (req, res) => {
  const { template_id, location_id, scheduled_date, frequency, assigned_to } = req.body;
  const dbInstance = db.getDb();

  if (!template_id || !scheduled_date) {
    return res.status(400).json({ error: 'Template ID and scheduled date are required' });
  }

  // Calculate next run date based on frequency
  let nextRunDate = scheduled_date;
  if (frequency === 'daily') {
    const date = new Date(scheduled_date);
    date.setDate(date.getDate() + 1);
    nextRunDate = date.toISOString().split('T')[0];
  } else if (frequency === 'weekly') {
    const date = new Date(scheduled_date);
    date.setDate(date.getDate() + 7);
    nextRunDate = date.toISOString().split('T')[0];
  } else if (frequency === 'monthly') {
    const date = new Date(scheduled_date);
    date.setMonth(date.getMonth() + 1);
    nextRunDate = date.toISOString().split('T')[0];
  }

  dbInstance.run(
    `INSERT INTO scheduled_audits (template_id, location_id, assigned_to, scheduled_date, frequency, next_run_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [template_id, location_id || null, assigned_to || null, scheduled_date, frequency || 'once', nextRunDate, req.user.id],
    function(err, result) {
      if (err) {
        return res.status(500).json({ error: 'Error creating scheduled audit' });
      }
      const scheduleId = (result && result.lastID) ? result.lastID : (this.lastID || 0);
      res.status(201).json({ id: scheduleId, message: 'Scheduled audit created successfully' });
    }
  );
});

// Update scheduled audit
router.put('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { template_id, location_id, scheduled_date, frequency, assigned_to, status } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  // Calculate next run date based on frequency if frequency or scheduled_date changed
  let nextRunDate = scheduled_date;
  if (frequency === 'daily') {
    const date = new Date(scheduled_date);
    date.setDate(date.getDate() + 1);
    nextRunDate = date.toISOString().split('T')[0];
  } else if (frequency === 'weekly') {
    const date = new Date(scheduled_date);
    date.setDate(date.getDate() + 7);
    nextRunDate = date.toISOString().split('T')[0];
  } else if (frequency === 'monthly') {
    const date = new Date(scheduled_date);
    date.setMonth(date.getMonth() + 1);
    nextRunDate = date.toISOString().split('T')[0];
  }

  dbInstance.run(
    `UPDATE scheduled_audits 
     SET template_id = ?, location_id = ?, assigned_to = ?, scheduled_date = ?, frequency = ?, next_run_date = ?, status = ?
     WHERE id = ? AND created_by = ?`,
    [template_id, location_id, assigned_to, scheduled_date, frequency || 'once', nextRunDate, status, id, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating scheduled audit' });
      }
      res.json({ message: 'Scheduled audit updated successfully' });
    }
  );
});

// Delete scheduled audit
router.delete('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  dbInstance.run('DELETE FROM scheduled_audits WHERE id = ? AND created_by = ?', [id, userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting scheduled audit' });
    }
    res.json({ message: 'Scheduled audit deleted successfully' });
  });
});

// Get scheduled audits report
router.get('/report', authenticate, (req, res) => {
  const userId = req.user.id;
  const { date_from, date_to, location_id, template_id, status, frequency } = req.query;
  const dbInstance = db.getDb();

  let query = `SELECT sa.*, ct.name as template_name, l.name as location_name, u.name as assigned_to_name
     FROM scheduled_audits sa
     JOIN checklist_templates ct ON sa.template_id = ct.id
     LEFT JOIN locations l ON sa.location_id = l.id
     LEFT JOIN users u ON sa.assigned_to = u.id
     WHERE sa.created_by = ? OR sa.assigned_to = ?`;
  
  const params = [userId, userId];

  // Apply filters
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
  if (status) {
    query += ' AND sa.status = ?';
    params.push(status);
  }
  if (frequency) {
    query += ' AND sa.frequency = ?';
    params.push(frequency);
  }

  query += ' ORDER BY sa.scheduled_date ASC';

  dbInstance.all(query, params, (err, schedules) => {
    if (err) {
      console.error('Scheduled audits report error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    // Calculate statistics
    const totalSchedules = schedules.length;
    const byStatus = {};
    const byFrequency = {};
    const byTemplate = {};
    const byLocation = {};
    const upcoming = [];
    const overdue = [];
    const today = new Date().toISOString().split('T')[0];

    schedules.forEach(schedule => {
      // By status
      const status = schedule.status || 'pending';
      byStatus[status] = (byStatus[status] || 0) + 1;

      // By frequency
      const freq = schedule.frequency || 'once';
      byFrequency[freq] = (byFrequency[freq] || 0) + 1;

      // By template
      const templateName = schedule.template_name || 'Unknown';
      if (!byTemplate[templateName]) {
        byTemplate[templateName] = { count: 0, completed: 0, pending: 0 };
      }
      byTemplate[templateName].count++;
      if (status === 'completed') {
        byTemplate[templateName].completed++;
      } else {
        byTemplate[templateName].pending++;
      }

      // By location
      const locationName = schedule.location_name || 'All Stores';
      if (!byLocation[locationName]) {
        byLocation[locationName] = { count: 0, completed: 0, pending: 0 };
      }
      byLocation[locationName].count++;
      if (status === 'completed') {
        byLocation[locationName].completed++;
      } else {
        byLocation[locationName].pending++;
      }

      // Upcoming and overdue
      const scheduledDate = schedule.scheduled_date;
      if (scheduledDate > today && status !== 'completed') {
        upcoming.push(schedule);
      } else if (scheduledDate < today && status !== 'completed') {
        overdue.push(schedule);
      }
    });

    res.json({
      summary: {
        totalSchedules,
        byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
        byFrequency: Object.entries(byFrequency).map(([frequency, count]) => ({ frequency, count })),
        upcoming: upcoming.length,
        overdue: overdue.length
      },
      byTemplate: Object.entries(byTemplate).map(([template, data]) => ({
        template,
        ...data
      })),
      byLocation: Object.entries(byLocation).map(([location, data]) => ({
        location,
        ...data
      })),
      upcoming: upcoming.slice(0, 10), // Next 10 upcoming
      overdue: overdue.slice(0, 10), // Next 10 overdue
      schedules: schedules.map(s => ({
        id: s.id,
        template_name: s.template_name,
        location_name: s.location_name,
        assigned_to_name: s.assigned_to_name,
        scheduled_date: s.scheduled_date,
        next_run_date: s.next_run_date,
        frequency: s.frequency,
        status: s.status || 'pending',
        created_at: s.created_at
      }))
    });
  });
});

module.exports = router;

