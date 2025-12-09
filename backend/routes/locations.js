const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const logger = require('../utils/logger');

const router = express.Router();

// Get all locations (filtered by user assignments for non-admin users)
router.get('/', authenticate, requirePermission('view_locations', 'manage_locations', 'start_scheduled_audits'), (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;
  const userRole = req.user.role;
  const { all, scheduled_audit_id } = req.query; // Admin can pass ?all=true, scheduled_audit_id to override assignments
  
  // Check if user is admin or manager - they can see all locations
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
  
  // If scheduled_audit_id is provided, allow access to that location regardless of assignments
  // This allows scheduled audits to override store assignment restrictions
  if (scheduled_audit_id) {
    dbInstance.get(
      `SELECT location_id FROM scheduled_audits WHERE id = ? AND (created_by = ? OR assigned_to = ?)`,
      [scheduled_audit_id, userId, userId],
      (err, schedule) => {
        if (err) {
          logger.error('Error fetching scheduled audit:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        if (schedule && schedule.location_id) {
          // Return the scheduled audit's location
          dbInstance.all(
            `SELECT * FROM locations WHERE id = ?`,
            [schedule.location_id],
            (err, locations) => {
              if (err) {
                logger.error('Error fetching scheduled audit location:', err);
                return res.status(500).json({ error: 'Database error' });
              }
              res.json({ locations: locations || [], filtered: false, fromScheduledAudit: true });
            }
          );
        } else {
          // Scheduled audit not found or no location - fall through to normal logic
          return res.status(404).json({ error: 'Scheduled audit not found or not assigned to you' });
        }
      }
    );
    return; // Exit early for scheduled audit case
  }
  
  if (isAdminOrManager && all === 'true') {
    // Admin/Manager requesting all locations (including inactive)
    dbInstance.all(
      `SELECT * FROM locations ORDER BY is_active DESC, name`,
      [],
      (err, locations) => {
        if (err) {
          logger.error('Error fetching locations:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ locations: locations || [], filtered: false });
      }
    );
  } else if (isAdminOrManager) {
    // Admin/Manager gets all locations by default (including inactive for management)
    dbInstance.all(
      `SELECT * FROM locations ORDER BY is_active DESC, name`,
      [],
      (err, locations) => {
        if (err) {
          logger.error('Error fetching locations:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ locations: locations || [], filtered: false });
      }
    );
  } else {
    // Non-admin users - check for assigned locations first
    dbInstance.all(
      `SELECT COUNT(*) as count FROM user_locations WHERE user_id = ?`,
      [userId],
      (err, countResult) => {
        if (err) {
          logger.error('Error checking user location assignments:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        const hasAssignments = countResult && countResult[0] && countResult[0].count > 0;
        
        if (hasAssignments) {
          // User has specific assignments - only show those locations (active only)
          dbInstance.all(
            `SELECT l.* FROM locations l
             INNER JOIN user_locations ul ON l.id = ul.location_id
             WHERE ul.user_id = ? AND (l.is_active IS NULL OR l.is_active = 1)
             ORDER BY l.name`,
            [userId],
            (err, locations) => {
              if (err) {
                logger.error('Error fetching assigned locations:', err);
                return res.status(500).json({ error: 'Database error' });
              }
              res.json({ locations: locations || [], filtered: true, assignedCount: locations?.length || 0 });
            }
          );
        } else {
          // No specific assignments - show all active locations (backward compatible)
          dbInstance.all(
            `SELECT * FROM locations WHERE is_active IS NULL OR is_active = 1 ORDER BY name`,
            [],
            (err, locations) => {
              if (err) {
                logger.error('Error fetching locations:', err);
                return res.status(500).json({ error: 'Database error' });
              }
              res.json({ locations: locations || [], filtered: false });
            }
          );
        }
      }
    );
  }
});

// Get single location
router.get('/:id', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  dbInstance.get(
    `SELECT * FROM locations WHERE id = ?`,
    [req.params.id],
    (err, location) => {
      if (err) {
        logger.error('Error fetching location:', err);
        logger.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }
      res.json({ location });
    }
  );
});

// Create location
router.post('/', authenticate, requirePermission('manage_locations'), (req, res) => {
  const { store_number, name, address, city, state, country, phone, email, parent_id, region, district, latitude, longitude } = req.body;
  const dbInstance = db.getDb();

  if (!name) {
    return res.status(400).json({ error: 'Location name is required' });
  }

  dbInstance.run(
    `INSERT INTO locations (store_number, name, address, city, state, country, phone, email, parent_id, region, district, latitude, longitude, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [store_number || null, name, address || null, city || null, state || null, country || null, phone || null, email || null, parent_id || null, region || null, district || null, latitude || null, longitude || null, req.user.id],
    function(err) {
      if (err) {
        logger.error('Error creating location:', err);
        return res.status(500).json({ error: 'Error creating location' });
      }
      res.status(201).json({ id: this.lastID, message: 'Location created successfully' });
    }
  );
});

// Update location
router.put('/:id', authenticate, requirePermission('manage_locations'), (req, res) => {
  const { id } = req.params;
  const { store_number, name, address, city, state, country, phone, email, parent_id, region, district, latitude, longitude, is_active } = req.body;
  const dbInstance = db.getDb();

  // Prevent circular reference (location cannot be its own parent)
  if (parent_id && parseInt(parent_id) === parseInt(id)) {
    return res.status(400).json({ error: 'Location cannot be its own parent' });
  }

  // Build dynamic update query to handle is_active if provided
  let query = `UPDATE locations 
     SET store_number = ?, name = ?, address = ?, city = ?, state = ?, country = ?, phone = ?, email = ?, parent_id = ?, region = ?, district = ?, latitude = ?, longitude = ?`;
  let params = [store_number || null, name, address || null, city || null, state || null, country || null, phone || null, email || null, parent_id || null, region || null, district || null, latitude || null, longitude || null];
  
  if (is_active !== undefined) {
    query += `, is_active = ?`;
    params.push(is_active ? 1 : 0);
  }
  
  query += ` WHERE id = ?`;
  params.push(id);

  dbInstance.run(query, params, function(err) {
      if (err) {
        logger.error('Error updating location:', err);
        return res.status(500).json({ error: 'Error updating location' });
      }
      res.json({ message: 'Location updated successfully' });
    }
  );
});

// Toggle location active status
router.patch('/:id/toggle-active', authenticate, requirePermission('manage_locations'), (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();

  // First get current status
  dbInstance.get('SELECT is_active FROM locations WHERE id = ?', [id], (err, location) => {
    if (err) {
      logger.error('Error fetching location:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Handle NULL/undefined as active (1) for backward compatibility
    const currentStatus = location.is_active === null || location.is_active === undefined ? 1 : location.is_active;
    const newStatus = (currentStatus === 1 || currentStatus === true) ? 0 : 1;
    
    dbInstance.run('UPDATE locations SET is_active = ? WHERE id = ?', [newStatus, id], function(err) {
      if (err) {
        logger.error('Error toggling location status:', err);
        return res.status(500).json({ error: 'Error updating location status' });
      }
      res.json({ 
        message: newStatus === 1 ? 'Store activated' : 'Store deactivated',
        is_active: newStatus === 1
      });
    });
  });
});

// Delete location
router.delete('/:id', authenticate, requirePermission('manage_locations'), (req, res) => {
  const { id } = req.params;
  const { force } = req.query; // Allow force delete with ?force=true
  const dbInstance = db.getDb();

  // Check if location has audits
  dbInstance.get('SELECT COUNT(*) as count FROM audits WHERE location_id = ?', [id], (err, row) => {
    if (err) {
      logger.error('Error checking audits for location:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const auditCount = row ? row.count : 0;
    
    if (auditCount > 0 && force !== 'true') {
      // Return 409 Conflict with details about the audits
      return res.status(409).json({ 
        error: 'Cannot delete store with existing audits',
        message: `This store has ${auditCount} audit(s) associated with it. Delete them first or use force delete.`,
        auditCount: auditCount,
        canForceDelete: true
      });
    }

    // If force delete, remove associated audits first
    if (auditCount > 0 && force === 'true') {
      logger.warn(`Force deleting location ${id} with ${auditCount} audits`);
      
      // Delete audit responses first (foreign key constraint)
      dbInstance.run('DELETE FROM audit_responses WHERE audit_id IN (SELECT id FROM audits WHERE location_id = ?)', [id], function(err) {
        if (err) {
          logger.error('Error deleting audit responses:', err);
          return res.status(500).json({ error: 'Error deleting associated audit responses' });
        }
        
        // Delete audits
        dbInstance.run('DELETE FROM audits WHERE location_id = ?', [id], function(err) {
          if (err) {
            logger.error('Error deleting audits:', err);
            return res.status(500).json({ error: 'Error deleting associated audits' });
          }
          
          // Now delete the location
          dbInstance.run('DELETE FROM locations WHERE id = ?', [id], function(err) {
            if (err) {
              logger.error('Error deleting location:', err);
              return res.status(500).json({ error: 'Error deleting location' });
            }
            logger.info(`Location ${id} and ${auditCount} audits deleted successfully`);
            res.json({ 
              message: 'Store and associated audits deleted successfully',
              deletedAudits: auditCount
            });
          });
        });
      });
    } else {
      // No audits, safe to delete
      dbInstance.run('DELETE FROM locations WHERE id = ?', [id], function(err) {
        if (err) {
          logger.error('Error deleting location:', err);
          return res.status(500).json({ error: 'Error deleting location' });
        }
        res.json({ message: 'Store deleted successfully' });
      });
    }
  });
});

// Bulk import locations/stores from CSV
router.post('/import', authenticate, async (req, res) => {
  const dbInstance = db.getDb();
  const createdBy = req.user.id;
  const { stores } = req.body; // Array of store objects

  if (!Array.isArray(stores) || stores.length === 0) {
    return res.status(400).json({ error: 'Stores array is required' });
  }

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  // Helper function to create or update location
  const createOrUpdateLocation = (store) => {
    return new Promise((resolve, reject) => {
      const { store: storeNumber, storeName, address, city, state, country, phone, email, latitude, longitude } = store;
      
      if (!storeName && !storeNumber) {
        return reject(new Error('Store name or store number is required'));
      }

      const name = storeName || `Store ${storeNumber}`;
      const locationAddress = address || (storeNumber ? `Store ${storeNumber}` : '');
      
      // Parse latitude and longitude as floats
      const lat = latitude && !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null;
      const lng = longitude && !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null;

      // Check if location exists by store number, name, or address
      dbInstance.get(
        'SELECT id FROM locations WHERE store_number = ? OR name = ? OR (address LIKE ? AND ? IS NOT NULL)',
        [storeNumber, name, `%${storeNumber}%`, storeNumber],
        (err, existing) => {
          if (err) return reject(err);

          if (existing) {
            // Update existing location
            dbInstance.run(
              `UPDATE locations 
               SET store_number = ?, name = ?, address = ?, city = ?, state = ?, country = ?, phone = ?, email = ?, latitude = ?, longitude = ?
               WHERE id = ?`,
              [storeNumber || null, name, locationAddress, city || null, state || null, country || null, phone || null, email || null, lat, lng, existing.id],
              function(err) {
                if (err) return reject(err);
                resolve({ id: existing.id, name, store_number: storeNumber, updated: true, has_gps: !!(lat && lng) });
              }
            );
          } else {
            // Create new location
            dbInstance.run(
              `INSERT INTO locations (store_number, name, address, city, state, country, phone, email, latitude, longitude, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [storeNumber || null, name, locationAddress, city || null, state || null, country || null, phone || null, email || null, lat, lng, createdBy],
              function(err) {
                if (err) return reject(err);
                const locationId = (this && this.lastID) ? this.lastID : 0;
                resolve({ id: locationId, name, store_number: storeNumber, updated: false, has_gps: !!(lat && lng) });
              }
            );
          }
        }
      );
    });
  };

  // Process each store
  for (let i = 0; i < stores.length; i++) {
    const store = stores[i];
    
    try {
      if (!store.storeName && !store.store) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: Missing store name and store number`);
        continue;
      }

      const result = await createOrUpdateLocation(store);
      logger.debug(`✓ Row ${i + 1}: ${result.updated ? 'Updated' : 'Created'} store "${result.name}" (ID: ${result.id})`);
      results.success++;
    } catch (error) {
      logger.error(`✗ Row ${i + 1}: Error - ${error.message}`);
      results.failed++;
      results.errors.push(`Row ${i + 1}: ${error.message}`);
    }
  }

  res.json({
    message: `Import completed: ${results.success} successful, ${results.failed} failed, ${results.skipped} skipped`,
    results
  });
});

// Get locations by hierarchy (regions, districts, locations)
router.get('/hierarchy/tree', authenticate, requirePermission('view_locations', 'manage_locations'), (req, res) => {
  const dbInstance = db.getDb();
  
  dbInstance.all(
    `SELECT l.*, 
            p.name as parent_name,
            (SELECT COUNT(*) FROM locations WHERE parent_id = l.id) as child_count
     FROM locations l
     LEFT JOIN locations p ON l.parent_id = p.id
     ORDER BY l.region, l.district, l.name`,
    [],
    (err, locations) => {
      if (err) {
        logger.error('Error fetching location hierarchy:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Build tree structure
      const locationMap = {};
      const rootLocations = [];
      
      locations.forEach(loc => {
        locationMap[loc.id] = { ...loc, children: [] };
      });
      
      locations.forEach(loc => {
        if (loc.parent_id && locationMap[loc.parent_id]) {
          locationMap[loc.parent_id].children.push(locationMap[loc.id]);
        } else {
          rootLocations.push(locationMap[loc.id]);
        }
      });
      
      res.json({ locations: rootLocations, flat: locations });
    }
  );
});

// Get locations by region
router.get('/hierarchy/regions', authenticate, requirePermission('view_locations', 'manage_locations'), (req, res) => {
  const dbInstance = db.getDb();
  
  dbInstance.all(
    `SELECT region, COUNT(*) as location_count
     FROM locations
     WHERE region IS NOT NULL AND region != ''
     GROUP BY region
     ORDER BY region`,
    [],
    (err, regions) => {
      if (err) {
        logger.error('Error fetching regions:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ regions: regions || [] });
    }
  );
});

// Get locations by district
router.get('/hierarchy/districts', authenticate, requirePermission('view_locations', 'manage_locations'), (req, res) => {
  const { region } = req.query;
  const dbInstance = db.getDb();
  
  let query = `SELECT district, region, COUNT(*) as location_count
               FROM locations
               WHERE district IS NOT NULL AND district != ''`;
  const params = [];
  
  if (region) {
    query += ' AND region = ?';
    params.push(region);
  }
  
  query += ' GROUP BY district, region ORDER BY region, district';
  
  dbInstance.all(query, params, (err, districts) => {
    if (err) {
      logger.error('Error fetching districts:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ districts: districts || [] });
  });
});

// Location performance metrics
router.get('/:id/performance', authenticate, requirePermission('view_locations', 'view_analytics'), (req, res) => {
  const { id } = req.params;
  const { date_from, date_to } = req.query;
  const dbInstance = db.getDb();
  
  let dateFilter = '';
  const params = [id];
  const dbType = process.env.DB_TYPE || 'sqlite';
  
  if (date_from && date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) >= CAST(? AS DATE) AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) >= ? AND DATE(a.created_at) <= ?';
    }
    params.push(date_from, date_to);
  }
  
  const query = `
    SELECT 
      COUNT(*) as total_audits,
      SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_audits,
      AVG(a.score) as avg_score,
      MIN(a.score) as min_score,
      MAX(a.score) as max_score,
      COUNT(DISTINCT a.user_id) as unique_auditors,
      COUNT(DISTINCT a.template_id) as templates_used
    FROM audits a
    WHERE a.location_id = ? ${dateFilter}
  `;
  
  dbInstance.get(query, params, (err, metrics) => {
    if (err) {
      logger.error('Error fetching location performance:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ metrics: metrics || {} });
  });
});

// Location comparison (compare multiple locations)
router.post('/compare', authenticate, requirePermission('view_locations', 'view_analytics'), (req, res) => {
  const { location_ids, date_from, date_to } = req.body;
  const dbInstance = db.getDb();
  
  if (!Array.isArray(location_ids) || location_ids.length === 0) {
    return res.status(400).json({ error: 'Location IDs array is required' });
  }
  
  let dateFilter = '';
  const params = [...location_ids]; // Spread the array to pass individual IDs for SQL IN clause
  const dbType = process.env.DB_TYPE || 'sqlite';
  const placeholders = location_ids.map(() => '?').join(',');
  
  if (date_from && date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) >= CAST(? AS DATE) AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) >= ? AND DATE(a.created_at) <= ?';
    }
    params.push(date_from, date_to);
  }
  
  // Build query with proper parameter handling
  let query = `
    SELECT 
      l.id,
      l.name,
      l.store_number,
      l.region,
      l.district,
      COUNT(a.id) as total_audits,
      SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_audits,
      AVG(a.score) as avg_score,
      MIN(a.score) as min_score,
      MAX(a.score) as max_score`;
  
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    query += `, ROUND(100.0 * SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0), 2) as completion_rate`;
  } else {
    query += `, ROUND(100.0 * SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0), 2) as completion_rate`;
  }
  
  query += `
    FROM locations l
    LEFT JOIN audits a ON l.id = a.location_id ${dateFilter}
    WHERE l.id IN (${placeholders})
    GROUP BY l.id, l.name, l.store_number, l.region, l.district
    ORDER BY avg_score DESC
  `;
  
  dbInstance.all(query, params, (err, comparisons) => {
    if (err) {
      logger.error('Error comparing locations:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ comparisons: comparisons || [] });
  });
});

// ========================================
// USER-LOCATION ASSIGNMENTS (Store Access)
// ========================================

// Get all user-location assignments (admin only)
router.get('/assignments/all', authenticate, requirePermission('manage_locations'), (req, res) => {
  const dbInstance = db.getDb();
  
  dbInstance.all(
    `SELECT ul.*, 
            u.name as user_name, u.email as user_email, u.role as user_role,
            l.name as location_name, l.store_number,
            ab.name as assigned_by_name
     FROM user_locations ul
     JOIN users u ON ul.user_id = u.id
     JOIN locations l ON ul.location_id = l.id
     LEFT JOIN users ab ON ul.assigned_by = ab.id
     ORDER BY u.name, l.name`,
    [],
    (err, assignments) => {
      if (err) {
        logger.error('Error fetching user-location assignments:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ assignments: assignments || [] });
    }
  );
});

// Get locations assigned to a specific user
router.get('/assignments/user/:userId', authenticate, requirePermission('manage_locations', 'view_users'), (req, res) => {
  const dbInstance = db.getDb();
  const { userId } = req.params;
  
  dbInstance.all(
    `SELECT l.*, ul.access_type, ul.assigned_at,
            ab.name as assigned_by_name
     FROM locations l
     JOIN user_locations ul ON l.id = ul.location_id
     LEFT JOIN users ab ON ul.assigned_by = ab.id
     WHERE ul.user_id = ?
     ORDER BY l.name`,
    [userId],
    (err, locations) => {
      if (err) {
        logger.error('Error fetching user locations:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ locations: locations || [] });
    }
  );
});

// Get users assigned to a specific location
router.get('/assignments/location/:locationId', authenticate, requirePermission('manage_locations'), (req, res) => {
  const dbInstance = db.getDb();
  const { locationId } = req.params;
  
  dbInstance.all(
    `SELECT u.id, u.name, u.email, u.role, ul.access_type, ul.assigned_at,
            ab.name as assigned_by_name
     FROM users u
     JOIN user_locations ul ON u.id = ul.user_id
     LEFT JOIN users ab ON ul.assigned_by = ab.id
     WHERE ul.location_id = ?
     ORDER BY u.name`,
    [locationId],
    (err, users) => {
      if (err) {
        logger.error('Error fetching location users:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ users: users || [] });
    }
  );
});

// Assign locations to a user (bulk)
router.post('/assignments/user/:userId', authenticate, requirePermission('manage_locations'), (req, res) => {
  const dbInstance = db.getDb();
  const { userId } = req.params;
  const { location_ids, access_type = 'assigned' } = req.body;
  const assignedBy = req.user.id;
  const dbType = process.env.DB_TYPE || 'sqlite';
  
  if (!Array.isArray(location_ids) || location_ids.length === 0) {
    return res.status(400).json({ error: 'Location IDs array is required' });
  }
  
  // First verify user exists
  dbInstance.get('SELECT id, name FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      logger.error('Error checking user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    const processAssignment = (index) => {
      if (index >= location_ids.length) {
        logger.info(`Assigned ${successCount} locations to user ${user.name} (${userId})`);
        return res.json({ 
          message: `${successCount} location(s) assigned successfully`,
          successCount,
          errorCount
        });
      }
      
      const locationId = location_ids[index];
      
      // Use database-specific upsert syntax
      let query;
      let params;
      
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        // MSSQL: Use MERGE for upsert
        query = `
          MERGE INTO user_locations AS target
          USING (SELECT ? AS user_id, ? AS location_id) AS source
          ON target.user_id = source.user_id AND target.location_id = source.location_id
          WHEN MATCHED THEN
            UPDATE SET access_type = ?, assigned_by = ?, assigned_at = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (user_id, location_id, access_type, assigned_by, assigned_at)
            VALUES (?, ?, ?, ?, GETDATE());
        `;
        params = [userId, locationId, access_type, assignedBy, userId, locationId, access_type, assignedBy];
      } else {
        // SQLite: Use INSERT OR REPLACE
        query = `INSERT OR REPLACE INTO user_locations (user_id, location_id, access_type, assigned_by, assigned_at)
                 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        params = [userId, locationId, access_type, assignedBy];
      }
      
      dbInstance.run(query, params, (err) => {
        if (err) {
          logger.error(`Error assigning location ${locationId} to user ${userId}:`, err);
          errorCount++;
        } else {
          successCount++;
        }
        processAssignment(index + 1);
      });
    };
    
    processAssignment(0);
  });
});

// Assign users to a location (bulk)
router.post('/assignments/location/:locationId', authenticate, requirePermission('manage_locations'), (req, res) => {
  const dbInstance = db.getDb();
  const { locationId } = req.params;
  const { user_ids, access_type = 'assigned' } = req.body;
  const assignedBy = req.user.id;
  const dbType = process.env.DB_TYPE || 'sqlite';
  
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ error: 'User IDs array is required' });
  }
  
  // First verify location exists
  dbInstance.get('SELECT id, name FROM locations WHERE id = ?', [locationId], (err, location) => {
    if (err) {
      logger.error('Error checking location:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    const processAssignment = (index) => {
      if (index >= user_ids.length) {
        logger.info(`Assigned ${successCount} users to location ${location.name} (${locationId})`);
        return res.json({ 
          message: `${successCount} user(s) assigned successfully`,
          successCount,
          errorCount
        });
      }
      
      const userId = user_ids[index];
      
      // Use database-specific upsert syntax
      let query;
      let params;
      
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        // MSSQL: Use MERGE for upsert
        query = `
          MERGE INTO user_locations AS target
          USING (SELECT ? AS user_id, ? AS location_id) AS source
          ON target.user_id = source.user_id AND target.location_id = source.location_id
          WHEN MATCHED THEN
            UPDATE SET access_type = ?, assigned_by = ?, assigned_at = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (user_id, location_id, access_type, assigned_by, assigned_at)
            VALUES (?, ?, ?, ?, GETDATE());
        `;
        params = [userId, locationId, access_type, assignedBy, userId, locationId, access_type, assignedBy];
      } else {
        // SQLite: Use INSERT OR REPLACE
        query = `INSERT OR REPLACE INTO user_locations (user_id, location_id, access_type, assigned_by, assigned_at)
                 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        params = [userId, locationId, access_type, assignedBy];
      }
      
      dbInstance.run(query, params, (err) => {
        if (err) {
          logger.error(`Error assigning user ${userId} to location ${locationId}:`, err);
          errorCount++;
        } else {
          successCount++;
        }
        processAssignment(index + 1);
      });
    };
    
    processAssignment(0);
  });
});

// Remove location assignment from user
router.delete('/assignments/user/:userId/location/:locationId', authenticate, requirePermission('manage_locations'), (req, res) => {
  const dbInstance = db.getDb();
  const { userId, locationId } = req.params;
  
  dbInstance.run(
    'DELETE FROM user_locations WHERE user_id = ? AND location_id = ?',
    [userId, locationId],
    function(err) {
      if (err) {
        logger.error('Error removing user-location assignment:', err);
        return res.status(500).json({ error: 'Error removing assignment' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Assignment not found' });
      }
      res.json({ message: 'Assignment removed successfully' });
    }
  );
});

// Remove all location assignments for a user
router.delete('/assignments/user/:userId', authenticate, requirePermission('manage_locations'), (req, res) => {
  const dbInstance = db.getDb();
  const { userId } = req.params;
  
  dbInstance.run(
    'DELETE FROM user_locations WHERE user_id = ?',
    [userId],
    function(err) {
      if (err) {
        logger.error('Error removing user location assignments:', err);
        return res.status(500).json({ error: 'Error removing assignments' });
      }
      res.json({ message: `${this.changes} assignment(s) removed successfully`, count: this.changes });
    }
  );
});

// Remove all user assignments for a location
router.delete('/assignments/location/:locationId', authenticate, requirePermission('manage_locations'), (req, res) => {
  const dbInstance = db.getDb();
  const { locationId } = req.params;
  
  dbInstance.run(
    'DELETE FROM user_locations WHERE location_id = ?',
    [locationId],
    function(err) {
      if (err) {
        logger.error('Error removing location user assignments:', err);
        return res.status(500).json({ error: 'Error removing assignments' });
      }
      res.json({ message: `${this.changes} assignment(s) removed successfully`, count: this.changes });
    }
  );
});

// Get assignment summary (for dashboard)
router.get('/assignments/summary', authenticate, requirePermission('manage_locations'), (req, res) => {
  const dbInstance = db.getDb();
  
  dbInstance.all(
    `SELECT 
       (SELECT COUNT(DISTINCT user_id) FROM user_locations) as users_with_assignments,
       (SELECT COUNT(DISTINCT location_id) FROM user_locations) as locations_with_assignments,
       (SELECT COUNT(*) FROM user_locations) as total_assignments,
       (SELECT COUNT(*) FROM users WHERE role NOT IN ('admin', 'manager')) as total_non_admin_users,
       (SELECT COUNT(*) FROM locations) as total_locations`,
    [],
    (err, result) => {
      if (err) {
        logger.error('Error fetching assignment summary:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ summary: result[0] || {} });
    }
  );
});

module.exports = router;

