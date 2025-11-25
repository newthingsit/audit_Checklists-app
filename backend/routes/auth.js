const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database-loader');
const { JWT_SECRET } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name } = req.body;
  const dbInstance = db.getDb();

  // Check if user exists
  dbInstance.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    dbInstance.run(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error creating user' });
        }

        const token = jwt.sign(
          { id: this.lastID, email, name },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.status(201).json({
          token,
          user: { id: this.lastID, email, name }
        });
      }
    );
  });
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  
  if (!db || !db.getDb) {
    console.error('Database module not loaded correctly');
    return res.status(500).json({ error: 'Database module error' });
  }
  
  let dbInstance;
  try {
    dbInstance = db.getDb();
  } catch (error) {
    console.error('Error getting database instance:', error);
    return res.status(500).json({ error: 'Database not initialized', details: error.message });
  }
  
  if (!dbInstance) {
    console.error('Database instance is null. Database may not be initialized.');
    return res.status(500).json({ error: 'Database not initialized' });
  }

  // Normalize email - we do this in JavaScript so we can use a simple database query
  const normalizedEmail = email.toLowerCase().trim();
  
  // Simple query - email is already normalized, so we can do a direct comparison
  // For case-insensitive comparison across all databases, we'll compare the normalized values
  dbInstance.get('SELECT * FROM users WHERE LOWER(email) = ?', [normalizedEmail], async (err, user) => {
    if (err) {
      logger.error('Login database error');
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      logger.security('login_failed', { reason: 'user_not_found' });
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.security('login_failed', { reason: 'password_mismatch', userId: user.id });
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Get user permissions from role
    const { getUserPermissions } = require('../middleware/permissions');
    getUserPermissions(user.id, user.role, (permErr, permissions) => {
      if (permErr) {
        logger.error('Error fetching permissions:', permErr.message);
        // Return user without permissions if error
        return res.json({
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: [] }
        });
      }
      logger.security('login_success', { userId: user.id });
      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: permissions || [] }
      });
    });
  });
});

// Get current user with permissions
router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  const dbInstance = db.getDb();
  dbInstance.get('SELECT id, email, name, role, created_at FROM users WHERE id = ?', 
    [req.user.id], (err, user) => {
      if (err) {
        logger.error('Error fetching user:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user permissions from role
      try {
        const { getUserPermissions } = require('../middleware/permissions');
        if (!user.role) {
          logger.warn('User has no role assigned', { userId: user.id });
          return res.json({ user: { ...user, permissions: [] } });
        }
        getUserPermissions(user.id, user.role, (permErr, permissions) => {
          if (permErr) {
            logger.error('Error fetching permissions:', permErr.message);
            // Return user without permissions if error
            return res.json({ user: { ...user, permissions: [] } });
          }
          res.json({ user: { ...user, permissions: permissions || [] } });
        });
      } catch (requireErr) {
        logger.error('Error loading permissions module:', requireErr.message);
        return res.status(500).json({ error: 'Error loading permissions module' });
      }
    });
});

// Update user profile
router.put('/profile', require('../middleware/auth').authenticate, async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Get current user
  dbInstance.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email !== user.email) {
      dbInstance.get('SELECT * FROM users WHERE email = ? AND id != ?', [email, userId], async (err, existingUser) => {
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
        let updateQuery = 'UPDATE users SET name = ?, email = ?';
        const params = [name, email];

        // If password is being changed
        if (newPassword) {
          if (!currentPassword) {
            return res.status(400).json({ error: 'Current password is required' });
          }

          // Verify current password
          const isMatch = await bcrypt.compare(currentPassword, user.password);
          if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
          }

          // Hash new password
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          updateQuery += ', password = ?';
          params.push(hashedPassword);
        }

        updateQuery += ' WHERE id = ?';
        params.push(userId);

        dbInstance.run(updateQuery, params, function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error updating profile' });
          }
          res.json({ message: 'Profile updated successfully' });
        });
      } catch (error) {
        return res.status(500).json({ error: 'Error updating profile' });
      }
    }
  });
});

module.exports = router;

