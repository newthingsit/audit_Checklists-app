const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all locations
router.get('/', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  dbInstance.all(
    `SELECT * FROM locations ORDER BY name`,
    [],
    (err, locations) => {
      if (err) {
        console.error('Error fetching locations:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
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
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }
      res.json({ location });
    }
  );
});

// Create location
router.post('/', authenticate, (req, res) => {
  const { name, address, city, state, country, phone, email } = req.body;
  const dbInstance = db.getDb();

  if (!name) {
    return res.status(400).json({ error: 'Location name is required' });
  }

  dbInstance.run(
    `INSERT INTO locations (name, address, city, state, country, phone, email)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, address || null, city || null, state || null, country || null, phone || null, email || null],
    function(err) {
      if (err) {
        console.error('Error creating location:', err);
        return res.status(500).json({ error: 'Error creating location', details: err.message });
      }
      res.status(201).json({ id: this.lastID, message: 'Location created successfully' });
    }
  );
});

// Update location
router.put('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { name, address, city, state, country, phone, email } = req.body;
  const dbInstance = db.getDb();

  dbInstance.run(
    `UPDATE locations 
     SET name = ?, address = ?, city = ?, state = ?, country = ?, phone = ?, email = ?
     WHERE id = ?`,
    [name, address || null, city || null, state || null, country || null, phone || null, email || null, id],
    function(err) {
      if (err) {
        console.error('Error updating location:', err);
        return res.status(500).json({ error: 'Error updating location', details: err.message });
      }
      res.json({ message: 'Location updated successfully' });
    }
  );
});

// Delete location
router.delete('/:id', authenticate, (req, res) => {
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

module.exports = router;

