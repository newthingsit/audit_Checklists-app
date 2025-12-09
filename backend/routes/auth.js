const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database-loader');
const { JWT_SECRET, authenticate } = require('../middleware/auth');
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
    logger.error('Database module not loaded correctly');
    return res.status(500).json({ error: 'Database module error' });
  }
  
  let dbInstance;
  try {
    dbInstance = db.getDb();
  } catch (error) {
    logger.error('Error getting database instance:', error);
    return res.status(500).json({ error: 'Database not initialized', details: error.message });
  }
  
  if (!dbInstance) {
    logger.error('Database instance is null. Database may not be initialized.');
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

    // Optimize permissions fetching - admins get all permissions immediately without DB query
    const { isAdminUser } = require('../middleware/permissions');
    const role = user.role ? user.role.toLowerCase() : '';
    
    // Fast path for admin users - no database query needed
    if (role === 'admin' || role === 'superadmin') {
      logger.security('login_success', { userId: user.id });
      return res.json({
        token,
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role, 
          permissions: ['*'] // Admin has all permissions
        }
      });
    }

    // For non-admin users, fetch permissions (but don't block login if it fails)
    const { getUserPermissions } = require('../middleware/permissions');
    getUserPermissions(user.id, user.role, (permErr, permissions) => {
      if (permErr) {
        logger.error('Error fetching permissions:', permErr.message);
        // Return user without permissions if error - don't block login
        logger.security('login_success', { userId: user.id });
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

// Change password only
router.put('/change-password', require('../middleware/auth').authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array(), error: errors.array()[0]?.msg });
  }

  const { currentPassword, newPassword } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  // Get current user
  dbInstance.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err) {
      logger.error('Error fetching user for password change:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        logger.security('password_change_failed', { userId, reason: 'incorrect_current_password' });
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      dbInstance.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], function(err) {
        if (err) {
          logger.error('Error updating password:', err);
          return res.status(500).json({ error: 'Error updating password' });
        }
        logger.security('password_changed', { userId });
        res.json({ message: 'Password changed successfully' });
      });
    } catch (error) {
      logger.error('Error in password change:', error);
      return res.status(500).json({ error: 'Error updating password' });
    }
  });
});

// Forgot Password - Send reset link
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  const { email } = req.body;
  const dbInstance = db.getDb();
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  dbInstance.get('SELECT * FROM users WHERE LOWER(email) = ?', [normalizedEmail], async (err, user) => {
    if (err) {
      logger.error('Error finding user for password reset:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      try {
        // Generate reset token (valid for 1 hour)
        const resetToken = jwt.sign(
          { userId: user.id, email: user.email, type: 'password_reset' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        // Store reset token in database (or use a separate table for password_reset_tokens)
        // For simplicity, we'll use the token directly and verify it on reset
        // In production, you might want to store tokens in a separate table with expiration

        // Send reset email
        const emailService = require('../utils/emailService');
        const appUrl = process.env.APP_URL || 'https://app.litebitefoods.com';
        const resetLink = `${appUrl}/login?token=${resetToken}`;

        const emailSubject = 'Password Reset Request - Audit Pro';
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #c41e3a 0%, #d32f2f 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Password Reset Request</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hello ${user.name || 'User'},</p>
              <p>You requested to reset your password for your Audit Pro account.</p>
              <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background: linear-gradient(135deg, #c41e3a 0%, #d32f2f 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
              </div>
              <p style="font-size: 12px; color: #666;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
              <p style="font-size: 12px; color: #666;">Or copy and paste this link into your browser:</p>
              <p style="font-size: 12px; color: #666; word-break: break-all;">${resetLink}</p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© 2025 Lite Bite Foods Audit Pro. All rights reserved.</p>
            </div>
          </body>
          </html>
        `;

        const emailSent = await emailService.sendEmail(user.email, emailSubject, emailHtml);
        
        if (emailSent) {
          logger.security('password_reset_requested', { userId: user.id });
        } else {
          logger.warn('Password reset email failed to send', { userId: user.id });
        }
      } catch (error) {
        logger.error('Error sending password reset email:', error);
        // Still return success to prevent email enumeration
      }
    }

    // Always return success message (security best practice - prevents email enumeration)
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  });
});

// Reset Password - Verify token and update password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0]?.msg || 'Invalid request' });
  }

  const { token, password } = req.body;
  const dbInstance = db.getDb();

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token is for password reset
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Find user
    dbInstance.get('SELECT * FROM users WHERE id = ?', [decoded.userId], async (err, user) => {
      if (err) {
        logger.error('Error finding user for password reset:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(400).json({ error: 'Invalid reset token' });
      }

      // Verify email matches (additional security check)
      if (user.email.toLowerCase() !== decoded.email.toLowerCase()) {
        return res.status(400).json({ error: 'Invalid reset token' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password
      dbInstance.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], function(err) {
        if (err) {
          logger.error('Error updating password:', err);
          return res.status(500).json({ error: 'Error updating password' });
        }

        logger.security('password_reset_completed', { userId: user.id });
        res.json({ message: 'Password reset successfully' });
      });
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }
    logger.error('Error resetting password:', error);
    return res.status(500).json({ error: 'Error resetting password' });
  }
});

// Test Email Configuration Endpoint (Admin only)
router.get('/test-email', authenticate, async (req, res) => {
  // Only allow admins to test email
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only administrators can test email configuration' });
  }

  const { email } = req.query;
  const testEmail = email || req.user.email;
  
  if (!testEmail || !testEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const emailService = require('../utils/emailService');
  const { isConfigured } = emailService;

  // Check if email service is configured
  if (!isConfigured()) {
    return res.status(503).json({ 
      error: 'Email service is not configured',
      details: 'Please set SMTP_USER and SMTP_PASSWORD environment variables in Azure App Service Configuration'
    });
  }

  // Send test email
  const testSubject = 'Test Email - Audit Pro Email Configuration';
  const testHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Test Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">✅ Email Configuration Test</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello,</p>
        <p>This is a test email from your Audit Pro application.</p>
        <p><strong>If you received this email, your email configuration is working correctly!</strong></p>
        <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Configuration Details:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>SMTP Host: ${process.env.SMTP_HOST || 'Not set'}</li>
            <li>SMTP Port: ${process.env.SMTP_PORT || 'Not set'}</li>
            <li>SMTP User: ${process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 3) + '***' : 'Not set'}</li>
            <li>From Email: ${process.env.SMTP_FROM || process.env.SMTP_USER || 'Not set'}</li>
          </ul>
        </div>
        <p style="font-size: 12px; color: #666;">This email was sent at ${new Date().toLocaleString()}.</p>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© 2025 Lite Bite Foods Audit Pro. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  try {
    const emailSent = await emailService.sendEmail(testEmail, testSubject, testHtml);
    
    if (emailSent) {
      res.json({ 
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        note: 'Please check your inbox (and spam folder) for the test email.'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send test email',
        details: 'Check server logs for detailed error information. Common issues:',
        troubleshooting: [
          '1. Verify SMTP_USER and SMTP_PASSWORD are correct',
          '2. For Office 365 with MFA, use App Password instead of regular password',
          '3. Check SMTP_HOST (should be smtp.office365.com)',
          '4. Check SMTP_PORT (should be 587 for Office 365)',
          '5. Verify firewall allows outbound SMTP connections',
          '6. Check Azure App Service logs for detailed error messages'
        ]
      });
    }
  } catch (error) {
    logger.error('Error in test email endpoint:', error);
    res.status(500).json({ 
      error: 'Error sending test email',
      details: error.message
    });
  }
});

module.exports = router;

