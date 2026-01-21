const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requirePermission, getUserPermissions, hasPermission, isAdminUser } = require('../middleware/permissions');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();

// Get users (admins or users with permissions can see all; others can request self only)
router.get('/', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const { search, role } = req.query;
  const scope = String(req.query.scope || '').toLowerCase();

  const listAllUsers = () => {
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
        logger.error('Error fetching users:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      res.json({ users: users || [] });
    });
  };

  if (isAdminUser(req.user)) {
    return listAllUsers();
  }

  getUserPermissions(req.user.id, req.user.role, (permErr, userPermissions) => {
    if (permErr) {
      logger.error('Error fetching user permissions:', permErr);
      return res.status(500).json({ error: 'Error checking permissions' });
    }

    const canViewAll = ['view_users', 'manage_users', 'create_users'].some(p =>
      hasPermission(userPermissions, p)
    );

    if (canViewAll) {
      return listAllUsers();
    }

    // Allow self-only list for assignment dropdowns
    if (scope === 'assignable') {
      return res.json({ users: [{ id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role }] });
    }

    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  });
});

// Get single user (admin or users with view_users, manage_users, or create_users permission)
router.get('/:id', authenticate, requirePermission('view_users', 'manage_users', 'create_users'), (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.params.id;

  dbInstance.get(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        logger.error('Error fetching user:', err);
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
router.post('/', authenticate, requirePermission('create_users', 'manage_users'), [
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
            logger.error('Error creating user:', err);
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
      logger.error('Error hashing password:', error);
      return res.status(500).json({ error: 'Error creating user' });
    }
  });
});

// Update user (admin or users with manage_users permission)
router.put('/:id', authenticate, requirePermission('manage_users'), [
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
              logger.error('Error updating user:', err);
              return res.status(500).json({ error: 'Error updating user', details: err.message });
            }
            res.json({ message: 'User updated successfully' });
          }
        );
      } catch (error) {
        logger.error('Error updating user:', error);
        return res.status(500).json({ error: 'Error updating user' });
      }
    }
  });
});

// Delete user (admin only)
router.delete('/:id', authenticate, requirePermission('manage_users'), (req, res) => {
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
        logger.error('Error deleting user:', err);
        return res.status(500).json({ error: 'Error deleting user', details: err.message });
      }
      res.json({ message: 'User deleted successfully' });
    });
  });
});

// Bulk import users from CSV
router.post('/import', authenticate, requirePermission('create_users', 'manage_users'), async (req, res) => {
  const dbInstance = db.getDb();
  const { users: usersData } = req.body; // Array of user objects

  if (!Array.isArray(usersData) || usersData.length === 0) {
    return res.status(400).json({ error: 'Users array is required' });
  }

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  // Helper function to validate role
  const validateRole = (role) => {
    return new Promise((resolve, reject) => {
      if (!role) {
        return reject(new Error('Role is required'));
      }
      dbInstance.get('SELECT * FROM roles WHERE name = ?', [role], (err, roleRecord) => {
        if (err) {
          return reject(new Error('Database error checking role'));
        }
        if (!roleRecord) {
          return reject(new Error(`Invalid role: ${role}`));
        }
        resolve();
      });
    });
  };

  // Helper function to check if user exists
  const checkUserExists = (email) => {
    return new Promise((resolve, reject) => {
      dbInstance.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
          return reject(err);
        }
        resolve(!!user);
      });
    });
  };

  // Helper function to create user
  const createUser = (userData) => {
    return new Promise(async (resolve, reject) => {
      const { name, email, role, password } = userData;

      // Validate required fields
      if (!name || !email || !role) {
        return reject(new Error('Name, email, and role are required'));
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reject(new Error(`Invalid email format: ${email}`));
      }

      try {
        // Validate role
        await validateRole(role);

        // Check if user already exists
        const exists = await checkUserExists(email);
        if (exists) {
          return reject(new Error(`User with email ${email} already exists`));
        }

        // Generate default password if not provided
        const userPassword = password || 'TempPassword123!';
        
        // Validate password length
        if (userPassword.length < 6) {
          return reject(new Error('Password must be at least 6 characters'));
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userPassword, 10);

        // Create user
        dbInstance.run(
          'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
          [email, hashedPassword, name, role],
          function(err) {
            if (err) {
              return reject(new Error(`Database error: ${err.message}`));
            }
            resolve({ id: this.lastID, email, name, role });
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  };

  // Process each user
  for (let i = 0; i < usersData.length; i++) {
    const userData = usersData[i];
    try {
      await createUser(userData);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: i + 1,
        email: userData.email || 'N/A',
        error: error.message
      });
    }
  }

  res.json({
    message: `Import completed: ${results.success} successful, ${results.failed} failed`,
    results
  });
});

module.exports = router;

