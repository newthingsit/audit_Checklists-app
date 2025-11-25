const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

// Get all locations
router.get('/', authenticate, requirePermission('view_locations', 'manage_locations', 'start_scheduled_audits'), (req, res) => {
  const dbInstance = db.getDb();
  dbInstance.all(
    `SELECT * FROM locations ORDER BY name`,
    [],
    (err, locations) => {
      if (err) {
        console.error('Error fetching locations:', err);
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ locations: locations || [] });
    }
  );
});

// Get single location
router.get('/:id', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  dbInstance.get(
    `SELECT * FROM locations WHERE id = ?`,
    [req.params.id],
    (err, location) => {
      if (err) {
        console.error('Error fetching location:', err);
        console.error('Database error:', err);
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
  const { store_number, name, address, city, state, country, phone, email, parent_id, region, district } = req.body;
  const dbInstance = db.getDb();

  if (!name) {
    return res.status(400).json({ error: 'Location name is required' });
  }

  dbInstance.run(
    `INSERT INTO locations (store_number, name, address, city, state, country, phone, email, parent_id, region, district, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [store_number || null, name, address || null, city || null, state || null, country || null, phone || null, email || null, parent_id || null, region || null, district || null, req.user.id],
    function(err) {
      if (err) {
        console.error('Error creating location:', err);
        return res.status(500).json({ error: 'Error creating location' });
      }
      res.status(201).json({ id: this.lastID, message: 'Location created successfully' });
    }
  );
});

// Update location
router.put('/:id', authenticate, requirePermission('manage_locations'), (req, res) => {
  const { id } = req.params;
  const { store_number, name, address, city, state, country, phone, email, parent_id, region, district } = req.body;
  const dbInstance = db.getDb();

  // Prevent circular reference (location cannot be its own parent)
  if (parent_id && parseInt(parent_id) === parseInt(id)) {
    return res.status(400).json({ error: 'Location cannot be its own parent' });
  }

  dbInstance.run(
    `UPDATE locations 
     SET store_number = ?, name = ?, address = ?, city = ?, state = ?, country = ?, phone = ?, email = ?, parent_id = ?, region = ?, district = ?
     WHERE id = ?`,
    [store_number || null, name, address || null, city || null, state || null, country || null, phone || null, email || null, parent_id || null, region || null, district || null, id],
    function(err) {
      if (err) {
        console.error('Error updating location:', err);
        return res.status(500).json({ error: 'Error updating location' });
      }
      res.json({ message: 'Location updated successfully' });
    }
  );
});

// Delete location
router.delete('/:id', authenticate, requirePermission('manage_locations'), (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();

  // Check if location has audits
  dbInstance.get('SELECT COUNT(*) as count FROM audits WHERE location_id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (row.count > 0) {
      return res.status(400).json({ error: 'Cannot delete location with existing audits' });
    }

    dbInstance.run('DELETE FROM locations WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting location' });
      }
      res.json({ message: 'Location deleted successfully' });
    });
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
      const { store: storeNumber, storeName, address, city, state, country, phone, email } = store;
      
      if (!storeName && !storeNumber) {
        return reject(new Error('Store name or store number is required'));
      }

      const name = storeName || `Store ${storeNumber}`;
      const locationAddress = address || (storeNumber ? `Store ${storeNumber}` : '');

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
               SET store_number = ?, name = ?, address = ?, city = ?, state = ?, country = ?, phone = ?, email = ?
               WHERE id = ?`,
              [storeNumber || null, name, locationAddress, city || null, state || null, country || null, phone || null, email || null, existing.id],
              function(err) {
                if (err) return reject(err);
                resolve({ id: existing.id, name, store_number: storeNumber, updated: true });
              }
            );
          } else {
            // Create new location
            dbInstance.run(
              `INSERT INTO locations (store_number, name, address, city, state, country, phone, email, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [storeNumber || null, name, locationAddress, city || null, state || null, country || null, phone || null, email || null, createdBy],
              function(err) {
                if (err) return reject(err);
                const locationId = (this && this.lastID) ? this.lastID : 0;
                resolve({ id: locationId, name, store_number: storeNumber, updated: false });
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
      console.log(`✓ Row ${i + 1}: ${result.updated ? 'Updated' : 'Created'} store "${result.name}" (ID: ${result.id})`);
      results.success++;
    } catch (error) {
      console.error(`✗ Row ${i + 1}: Error - ${error.message}`);
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
        console.error('Error fetching location hierarchy:', err);
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
        console.error('Error fetching regions:', err);
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
      console.error('Error fetching districts:', err);
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
      console.error('Error fetching location performance:', err);
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
      console.error('Error comparing locations:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ comparisons: comparisons || [] });
  });
});

module.exports = router;

