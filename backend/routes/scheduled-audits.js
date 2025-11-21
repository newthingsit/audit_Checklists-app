const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

// Helper function to check if user is admin
const isAdminUser = (user) => {
  if (!user) return false;
  const role = user.role ? user.role.toLowerCase() : '';
  return role === 'admin' || role === 'superadmin';
};

// Get all scheduled audits (admins see all, regular users see their own)
// Users can see their own scheduled audits - no permission check needed (similar to audits route)
router.get('/', authenticate, (req, res) => {
  console.log('[Scheduled Audits] Route hit - GET /api/scheduled-audits');
  console.log('[Scheduled Audits] User object:', JSON.stringify(req.user, null, 2));
  
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const userEmail = req.user.email || '';
  const isAdmin = isAdminUser(req.user);
  
  console.log('[Scheduled Audits] User ID:', userId, 'Email:', userEmail, 'Is Admin:', isAdmin);

  let query = `SELECT sa.*, ct.name as template_name, l.name as location_name, l.store_number,
               u.name as assigned_to_name, u.email as assigned_to_email,
               creator.name as created_by_name, creator.email as created_by_email
               FROM scheduled_audits sa
               JOIN checklist_templates ct ON sa.template_id = ct.id
               LEFT JOIN locations l ON sa.location_id = l.id
               LEFT JOIN users u ON sa.assigned_to = u.id
               LEFT JOIN users creator ON sa.created_by = creator.id`;

  // Get database type for query compatibility
  const dbType = process.env.DB_TYPE || 'sqlite';
  
  let params = [];
  if (isAdmin) {
    query += ` WHERE 1=1`;
  } else {
    // For regular users, show audits where:
    // 1. They created it (created_by = userId)
    // 2. They are assigned to it (assigned_to = userId)
    // 3. OR assigned user's email matches (for cases where assigned_to might be wrong but email matches)
    
    // Use different syntax for SQL Server vs others
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      // SQL Server syntax
      query += ` WHERE sa.created_by = ? OR sa.assigned_to = ? OR sa.assigned_to IN (
        SELECT id FROM users WHERE LOWER(email) = LOWER(?)
      )`;
    } else {
      // SQLite/MySQL/PostgreSQL syntax
      // Check if assigned_to matches a user with the same email
      query += ` WHERE sa.created_by = ? OR sa.assigned_to = ? OR EXISTS (
        SELECT 1 FROM users u2 
        WHERE u2.id = sa.assigned_to 
        AND LOWER(u2.email) = LOWER(?)
      ) OR sa.assigned_to IN (
        SELECT id FROM users WHERE LOWER(email) = LOWER(?)
      )`;
    }
    // For SQL Server, we only need 3 params, for others we need 4
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      params = [userId, userId, userEmail];
    } else {
      params = [userId, userId, userEmail, userEmail];
    }
  }

  // Exclude completed scheduled audits from the main list
  // Completed audits should be viewed in audit history, not in scheduled audits
  // Handle case-insensitive comparison and NULL values
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    // SQL Server: Use LOWER and LTRIM/RTRIM for case-insensitive comparison
    query += ` AND (sa.status IS NULL OR LOWER(LTRIM(RTRIM(CAST(sa.status AS VARCHAR(50))))) <> 'completed')`;
  } else {
    // SQLite/MySQL/PostgreSQL: Use LOWER() and TRIM() for case-insensitive comparison
    query += ` AND (sa.status IS NULL OR LOWER(TRIM(COALESCE(sa.status, ''))) <> 'completed')`;
  }

  query += ` ORDER BY sa.scheduled_date ASC`;

  dbInstance.all(query, params, (err, schedules) => {
    if (err) {
      console.error('Error fetching scheduled audits:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    // Debug logging
    console.log(`[Scheduled Audits] User: ${req.user.name} (ID: ${userId}, Email: ${userEmail})`);
    console.log(`[Scheduled Audits] Query: ${query}`);
    console.log(`[Scheduled Audits] Params:`, params);
    console.log(`[Scheduled Audits] Found ${schedules.length} schedules`);
    if (schedules.length > 0) {
      console.log(`[Scheduled Audits] Sample schedule:`, {
        id: schedules[0].id,
        assigned_to: schedules[0].assigned_to,
        assigned_to_name: schedules[0].assigned_to_name,
        assigned_to_email: schedules[0].assigned_to_email,
        created_by: schedules[0].created_by
      });
    }
    
    res.json({ schedules });
  });
});

// Get single scheduled audit
router.get('/:id', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const userEmail = req.user.email || '';
  const isAdmin = isAdminUser(req.user);

  let query = `SELECT sa.*, ct.name as template_name, l.name as location_name, u.name as assigned_to_name, u.email as assigned_to_email
     FROM scheduled_audits sa
     JOIN checklist_templates ct ON sa.template_id = ct.id
     LEFT JOIN locations l ON sa.location_id = l.id
     LEFT JOIN users u ON sa.assigned_to = u.id
     WHERE sa.id = ?`;
  
  let params = [req.params.id];
  
  if (!isAdmin) {
    query += ` AND (sa.created_by = ? OR sa.assigned_to = ? OR EXISTS (
      SELECT 1 FROM users u2 
      WHERE u2.id = sa.assigned_to 
      AND LOWER(u2.email) = LOWER(?)
    ))`;
    params.push(userId, userId, userEmail);
  }

  dbInstance.get(query, params,
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
router.post('/', authenticate, requirePermission('manage_scheduled_audits', 'create_scheduled_audits'), (req, res) => {
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
router.put('/:id', authenticate, requirePermission('manage_scheduled_audits', 'update_scheduled_audits'), (req, res) => {
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
router.delete('/:id', authenticate, requirePermission('manage_scheduled_audits', 'delete_scheduled_audits'), (req, res) => {
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
  const isAdmin = isAdminUser(req.user);
  const { date_from, date_to, location_id, template_id, status, frequency } = req.query;
  const dbInstance = db.getDb();

  let query = `SELECT sa.*, ct.name as template_name, l.name as location_name, l.store_number,
               u.name as assigned_to_name, u.email as assigned_to_email
               FROM scheduled_audits sa
               JOIN checklist_templates ct ON sa.template_id = ct.id
               LEFT JOIN locations l ON sa.location_id = l.id
               LEFT JOIN users u ON sa.assigned_to = u.id`;
  
  let params = [];
  if (isAdmin) {
    query += ` WHERE 1=1`;
  } else {
    query += ` WHERE sa.created_by = ? OR sa.assigned_to = ?`;
    params = [userId, userId];
  }

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

// Bulk import scheduled audits from CSV
router.post('/import', authenticate, requirePermission('manage_scheduled_audits', 'create_scheduled_audits'), async (req, res) => {
  const dbInstance = db.getDb();
  const createdBy = req.user.id;
  const { schedules } = req.body; // Array of schedule objects

  if (!Array.isArray(schedules) || schedules.length === 0) {
    return res.status(400).json({ error: 'Schedules array is required' });
  }

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  // Get database type for query compatibility
  const dbType = process.env.DB_TYPE || 'sqlite';

  // Helper functions
  const findUser = (employeeId, name) => {
    return new Promise((resolve, reject) => {
      // If employeeId looks like an email, try email match first
      if (employeeId && employeeId.includes('@')) {
        const query1 = dbType === 'mssql' || dbType === 'sqlserver'
          ? 'SELECT TOP 1 id, name, email FROM users WHERE LOWER(LTRIM(RTRIM(email))) = LOWER(LTRIM(RTRIM(?)))'
          : 'SELECT id, name, email FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1';
        dbInstance.get(query1, [employeeId], (err, user) => {
          if (err) return reject(err);
          if (user) return resolve(user);
          
          // Fallback to name match
          const query2 = dbType === 'mssql' || dbType === 'sqlserver'
            ? 'SELECT TOP 1 id, name, email FROM users WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(?)))'
            : 'SELECT id, name, email FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1';
          dbInstance.get(query2, [name], (err, user) => {
            if (err) return reject(err);
            resolve(user);
          });
        });
      } else {
        // Try case-insensitive name match first
        const query1 = dbType === 'mssql' || dbType === 'sqlserver'
          ? 'SELECT TOP 1 id, name, email FROM users WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(?)))'
          : 'SELECT id, name, email FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1';
        dbInstance.get(query1, [name], (err, user) => {
          if (err) return reject(err);
          if (user) return resolve(user);
          
          // Try email match with employee ID (case-insensitive)
          if (employeeId) {
            const query2 = dbType === 'mssql' || dbType === 'sqlserver'
              ? 'SELECT TOP 1 id, name, email FROM users WHERE LOWER(LTRIM(RTRIM(email))) LIKE LOWER(?) OR LOWER(LTRIM(RTRIM(email))) LIKE LOWER(?)'
              : 'SELECT id, name, email FROM users WHERE LOWER(TRIM(email)) LIKE LOWER(?) OR LOWER(TRIM(email)) LIKE LOWER(?) LIMIT 1';
            dbInstance.get(query2, [`%${employeeId}%`, `${employeeId}@%`], (err, user) => {
              if (err) return reject(err);
              resolve(user);
            });
          } else {
            resolve(null);
          }
        });
      }
    });
  };

  const findTemplate = (checklistName) => {
    return new Promise((resolve, reject) => {
      // First try exact match (case-insensitive)
      const query1 = dbType === 'mssql' || dbType === 'sqlserver'
        ? 'SELECT TOP 1 id, name FROM checklist_templates WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(?)))'
        : 'SELECT id, name FROM checklist_templates WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1';
      dbInstance.get(query1, [checklistName], (err, template) => {
        if (err) return reject(err);
        if (template) return resolve(template);
        
        // Try partial match (case-insensitive)
        const query2 = dbType === 'mssql' || dbType === 'sqlserver'
          ? 'SELECT TOP 1 id, name FROM checklist_templates WHERE LOWER(LTRIM(RTRIM(name))) LIKE LOWER(LTRIM(RTRIM(?)))'
          : 'SELECT id, name FROM checklist_templates WHERE LOWER(TRIM(name)) LIKE LOWER(TRIM(?)) LIMIT 1';
        dbInstance.get(query2, [`%${checklistName}%`], (err, template) => {
          if (err) return reject(err);
          if (template) return resolve(template);
          
          // Try matching without special characters
          const cleanName = checklistName.replace(/[-\s]/g, '');
          const query3 = dbType === 'mssql' || dbType === 'sqlserver'
            ? 'SELECT TOP 1 id, name FROM checklist_templates WHERE LOWER(REPLACE(REPLACE(name, \'-\', \'\'), \' \', \'\')) = LOWER(?)'
            : 'SELECT id, name FROM checklist_templates WHERE LOWER(REPLACE(REPLACE(name, "-", ""), " ", "")) = LOWER(?) LIMIT 1';
          dbInstance.get(query3, [cleanName], (err, template) => {
            if (err) return reject(err);
            resolve(template);
          });
        });
      });
    });
  };

  const findOrCreateLocation = (storeNumber, storeName) => {
    return new Promise((resolve, reject) => {
      // Try to find by store name first (case-insensitive)
      if (storeName) {
        const query1 = dbType === 'mssql' || dbType === 'sqlserver'
          ? 'SELECT TOP 1 id, name FROM locations WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(?)))'
          : 'SELECT id, name FROM locations WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1';
        dbInstance.get(query1, [storeName], (err, location) => {
          if (err) return reject(err);
          if (location) return resolve(location);
          
          // Try partial match on store name
          const query2 = dbType === 'mssql' || dbType === 'sqlserver'
            ? 'SELECT TOP 1 id, name FROM locations WHERE LOWER(LTRIM(RTRIM(name))) LIKE LOWER(?)'
            : 'SELECT id, name FROM locations WHERE LOWER(TRIM(name)) LIKE LOWER(?) LIMIT 1';
          dbInstance.get(query2, [`%${storeName}%`], (err, location) => {
            if (err) return reject(err);
            if (location) return resolve(location);
            
            // Try finding by store number
            if (storeNumber) {
              const query3 = dbType === 'mssql' || dbType === 'sqlserver'
                ? 'SELECT TOP 1 id, name FROM locations WHERE store_number = ? OR name LIKE ?'
                : 'SELECT id, name FROM locations WHERE store_number = ? OR name LIKE ? LIMIT 1';
              dbInstance.get(query3, [storeNumber, `%${storeNumber}%`], (err, location) => {
                if (err) return reject(err);
                if (location) return resolve(location);
                
                // Create new location
                const locationName = storeName || `Store ${storeNumber}`;
                dbInstance.run(
                  'INSERT INTO locations (name, store_number, address, created_by) VALUES (?, ?, ?, ?)',
                  [locationName, storeNumber || null, `Store ${storeNumber || 'Unknown'}`, createdBy],
                  function(err) {
                    if (err) return reject(err);
                    const scheduleId = (this && this.lastID) ? this.lastID : 0;
                    resolve({ id: scheduleId, name: locationName });
                  }
                );
              });
            } else {
              // Create new location without store number
              const locationName = storeName || 'Unknown Store';
              dbInstance.run(
                'INSERT INTO locations (name, address, created_by) VALUES (?, ?, ?)',
                [locationName, 'Unknown', createdBy],
                function(err) {
                  if (err) return reject(err);
                  const scheduleId = (this && this.lastID) ? this.lastID : 0;
                  resolve({ id: scheduleId, name: locationName });
                }
              );
            }
          });
        });
      } else if (storeNumber) {
        // Try finding by store number only
        const query = dbType === 'mssql' || dbType === 'sqlserver'
          ? 'SELECT TOP 1 id, name FROM locations WHERE store_number = ? OR name LIKE ?'
          : 'SELECT id, name FROM locations WHERE store_number = ? OR name LIKE ? LIMIT 1';
        dbInstance.get(query, [storeNumber, `%${storeNumber}%`], (err, location) => {
          if (err) return reject(err);
          if (location) return resolve(location);
          
          // Create new location
          const locationName = `Store ${storeNumber}`;
          dbInstance.run(
            'INSERT INTO locations (name, store_number, address, created_by) VALUES (?, ?, ?, ?)',
            [locationName, storeNumber, `Store ${storeNumber}`, createdBy],
            function(err) {
              if (err) return reject(err);
              const scheduleId = (this && this.lastID) ? this.lastID : 0;
              resolve({ id: scheduleId, name: locationName });
            }
          );
        });
      } else {
        return reject(new Error('Store number or store name is required'));
      }
    });
  };

  const createScheduledAudit = (templateId, locationId, assignedTo, scheduledDate) => {
    return new Promise((resolve, reject) => {
      dbInstance.run(
        `INSERT INTO scheduled_audits (template_id, location_id, assigned_to, scheduled_date, frequency, next_run_date, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [templateId, locationId, assignedTo, scheduledDate, 'once', scheduledDate, 'pending', createdBy],
        function(err, result) {
          if (err) {
            console.error('Error creating scheduled audit:', err);
            return reject(err);
          }
          // Handle different database types for lastID
          const scheduleId = (this && this.lastID) ? this.lastID : ((result && result.lastID) ? result.lastID : 0);
          if (scheduleId === 0) {
            console.warn('Warning: Could not get lastID after insert. Schedule may have been created but ID is unknown.');
          }
          resolve(scheduleId);
        }
      );
    });
  };

  // Process each schedule
  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    const { employee, name, checklist, store, storeName, startDate, status } = schedule;

    try {
      console.log(`[Import] Processing row ${i + 1}:`, { employee, name, checklist, store, storeName, startDate });
      
      if (!name || !checklist || !startDate) {
        const missing = [];
        if (!name) missing.push('name');
        if (!checklist) missing.push('checklist');
        if (!startDate) missing.push('startDate');
        results.skipped++;
        results.errors.push(`Row ${i + 1}: Missing required fields: ${missing.join(', ')}`);
        console.log(`[Import] Row ${i + 1} skipped: Missing fields`);
        continue;
      }

      // Parse date - handle multiple formats (DD-MM-YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
      let dateStr;
      
      // Clean the date string
      const cleanDate = startDate.trim().replace(/['"]/g, '').replace(/\s+/g, ' ');
      
      console.log(`[Import] Parsing date for row ${i + 1}: "${cleanDate}"`);
      
      // Try parsing different date formats
      try {
        // First, try DD-MM-YYYY or DD/MM/YYYY format (e.g., "26-11-2025")
        const parts = cleanDate.split(/[-\/\.]/);
        if (parts.length === 3) {
          const part1 = parseInt(parts[0], 10);
          const part2 = parseInt(parts[1], 10);
          const part3 = parseInt(parts[2], 10);
          
          // Check if it's DD-MM-YYYY format (day > 12 indicates DD-MM format)
          if (part1 > 12 && part1 <= 31 && part2 >= 1 && part2 <= 12 && part3 > 1000) {
            // DD-MM-YYYY format: day, month, year
            // Format directly as YYYY-MM-DD to avoid timezone issues
            const year = part3;
            const month = String(part2).padStart(2, '0');
            const day = String(part1).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
            console.log(`[Import] Parsed as DD-MM-YYYY: ${dateStr}`);
          } else if (part1 >= 1 && part1 <= 12 && part2 >= 1 && part2 <= 31 && part3 > 1000) {
            // MM-DD-YYYY format: month, day, year
            const year = part3;
            const month = String(part1).padStart(2, '0');
            const day = String(part2).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
            console.log(`[Import] Parsed as MM-DD-YYYY: ${dateStr}`);
          } else if (part1 > 1000 && part2 >= 1 && part2 <= 12 && part3 >= 1 && part3 <= 31) {
            // YYYY-MM-DD format: year, month, day
            const year = part1;
            const month = String(part2).padStart(2, '0');
            const day = String(part3).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
            console.log(`[Import] Parsed as YYYY-MM-DD: ${dateStr}`);
          }
        }
        
        // If not parsed yet, try standard Date constructor and format manually
        if (!dateStr) {
          const scheduledDate = new Date(cleanDate);
          if (!isNaN(scheduledDate.getTime()) && scheduledDate.getFullYear() > 1000 && scheduledDate.getFullYear() <= 2100) {
            // Format manually to avoid timezone issues
            const year = scheduledDate.getFullYear();
            const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
            const day = String(scheduledDate.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
            console.log(`[Import] Parsed using Date constructor: ${dateStr}`);
          }
        }
      } catch (error) {
        console.error(`[Import] Date parsing error for row ${i + 1}:`, error);
        dateStr = null;
      }
      
      if (!dateStr) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: Invalid date format: "${startDate}" (expected: DD-MM-YYYY, MM/DD/YYYY, or YYYY-MM-DD)`);
        continue;
      }

      // Find user
      const user = await findUser(employee || '', name);
      if (!user) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: User not found: ${name}${employee ? ` (${employee})` : ''}`);
        continue;
      }
      console.log(`[Import] Found user: ${user.name} (${user.email}) for row ${i + 1}`);

      // Find template
      const template = await findTemplate(checklist);
      if (!template) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: Template not found: ${checklist}`);
        continue;
      }
      console.log(`[Import] Found template: ${template.name} for row ${i + 1}`);

      // Find or create location
      console.log(`[Import] Finding/creating location for row ${i + 1}: store="${store}", storeName="${storeName}"`);
      const location = await findOrCreateLocation(store || '', storeName || '');
      console.log(`[Import] Found/created location: ${location.name} (ID: ${location.id}) for row ${i + 1}`);

      // Create scheduled audit
      console.log(`[Import] Creating scheduled audit for row ${i + 1}: templateId=${template.id}, locationId=${location.id}, userId=${user.id}, date=${dateStr}`);
      const scheduleId = await createScheduledAudit(template.id, location.id, user.id, dateStr);
      console.log(`[Import] ✓ Successfully created scheduled audit ID: ${scheduleId} for row ${i + 1}`);

      results.success++;
    } catch (error) {
      console.error(`[Import] ✗ Error processing row ${i + 1}:`, error);
      results.failed++;
      const errorMsg = error.message || error.toString();
      results.errors.push(`Row ${i + 1}: ${errorMsg}`);
    }
  }

  console.log(`[Import] Import completed: ${results.success} successful, ${results.failed} failed, ${results.skipped} skipped`);
  if (results.errors.length > 0) {
    console.log(`[Import] Errors:`, results.errors);
  }
  
  res.json({
    message: `Import completed: ${results.success} successful, ${results.failed} failed, ${results.skipped} skipped`,
    results
  });
});

module.exports = router;

