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
  const { store_number, name, address, city, state, country, phone, email } = req.body;
  const dbInstance = db.getDb();

  if (!name) {
    return res.status(400).json({ error: 'Location name is required' });
  }

  dbInstance.run(
    `INSERT INTO locations (store_number, name, address, city, state, country, phone, email, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [store_number || null, name, address || null, city || null, state || null, country || null, phone || null, email || null, req.user.id],
    function(err) {
      if (err) {
        console.error('Error creating location:', err);
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
  const { store_number, name, address, city, state, country, phone, email } = req.body;
  const dbInstance = db.getDb();

  dbInstance.run(
    `UPDATE locations 
     SET store_number = ?, name = ?, address = ?, city = ?, state = ?, country = ?, phone = ?, email = ?
     WHERE id = ?`,
    [store_number || null, name, address || null, city || null, state || null, country || null, phone || null, email || null, id],
    function(err) {
      if (err) {
        console.error('Error updating location:', err);
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

module.exports = router;

