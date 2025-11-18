const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, (req, res) => {
  const dbInstance = db.getDb();
  const { search, role } = req.query;

  let query = 'SELECT id, email, name, role, created_at FROM users WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }

  query += ' ORDER BY created_at DESC';

  dbInstance.all(query, params, (err, users) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json({ users: users || [] });
  });
});

// Get single user (admin only)
router.get('/:id', authenticate, requireAdmin, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.params.id;

  dbInstance.get(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error('Error fetching user:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ user });
    }
  );
});

// Create new user (admin only)
router.post('/', authenticate, requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
      body('role').custom(async (value) => {
        const dbInstance = db.getDb();
        return new Promise((resolve, reject) => {
          dbInstance.get('SELECT * FROM roles WHERE name = ?', [value], (err, role) => {
            if (err) {
              reject(new Error('Database error'));
            } else if (!role) {
              reject(new Error('Invalid role'));
            } else {
              resolve();
            }
          });
        });
      })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, role } = req.body;
  const dbInstance = db.getDb();

  // Check if user exists
  dbInstance.get('SELECT * FROM users WHERE email = ?', [email], async (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      dbInstance.run(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, name, role || 'user'],
        function(err) {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Error creating user', details: err.message });
          }

          res.status(201).json({
            id: this.lastID,
            message: 'User created successfully',
            user: { id: this.lastID, email, name, role: role || 'user' }
          });
        }
      );
    } catch (error) {
      console.error('Error hashing password:', error);
      return res.status(500).json({ error: 'Error creating user' });
    }
  });
});

// Update user (admin only)
router.put('/:id', authenticate, requireAdmin, [
  body('email').optional().isEmail().normalizeEmail(),
  body('name').optional().trim().notEmpty(),
      body('role').optional().custom(async (value) => {
        if (!value) return true;
        const dbInstance = db.getDb();
        return new Promise((resolve, reject) => {
          dbInstance.get('SELECT * FROM roles WHERE name = ?', [value], (err, role) => {
            if (err) {
              reject(new Error('Database error'));
            } else if (!role) {
              reject(new Error('Invalid role'));
            } else {
              resolve();
            }
          });
        });
      }),
  body('password').optional().isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { email, name, role, password } = req.body;
  const dbInstance = db.getDb();

  // Get current user
  dbInstance.get('SELECT * FROM users WHERE id = ?', [id], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      dbInstance.get('SELECT * FROM users WHERE email = ? AND id != ?', [email, id], async (err, existingUser) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (existingUser) {
          return res.status(400).json({ error: 'Email already in use' });
        }
        updateUser();
      });
    } else {
      updateUser();
    }

    async function updateUser() {
      try {
        const updates = [];
        const params = [];

        if (email !== undefined) {
          updates.push('email = ?');
          params.push(email);
        }
        if (name !== undefined) {
          updates.push('name = ?');
          params.push(name);
        }
        if (role !== undefined) {
          updates.push('role = ?');
          params.push(role);
        }
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          updates.push('password = ?');
          params.push(hashedPassword);
        }

        if (updates.length === 0) {
          return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);

        dbInstance.run(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          params,
          function(err) {
            if (err) {
              console.error('Error updating user:', err);
              return res.status(500).json({ error: 'Error updating user', details: err.message });
            }
            res.json({ message: 'User updated successfully' });
          }
        );
      } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ error: 'Error updating user' });
      }
    }
  });
});

// Delete user (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();
  const currentUserId = req.user.id;

  // Prevent deleting yourself
  if (parseInt(id) === currentUserId) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  // Check if user exists
  dbInstance.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    dbInstance.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ error: 'Error deleting user', details: err.message });
      }
      res.json({ message: 'User deleted successfully' });
    });
  });
});

module.exports = router;

