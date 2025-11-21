/**
 * Secure error handler middleware
 * Prevents information disclosure in production
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Log error securely and return safe error message
 */
const handleError = (err, req, res, statusCode = 500, customMessage = null) => {
  // Log full error details server-side
  console.error(`[${new Date().toISOString()}] Error:`, {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: isDevelopment ? err.stack : undefined
  });

  // Return safe error message to client
  const message = customMessage || (isDevelopment ? err.message : 'An error occurred');
  res.status(statusCode).json({ 
    error: message,
    ...(isDevelopment && { details: err.message }) // Only show details in development
  });
};

/**
 * Database error handler
 */
const handleDatabaseError = (err, req, res, customMessage = 'Database error') => {
  console.error('Database error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    code: err.code
  });

  res.status(500).json({ 
    error: customMessage,
    ...(isDevelopment && { details: err.message })
  });
};

/**
 * Validation error handler
 */
const handleValidationError = (errors, req, res) => {
  res.status(400).json({ 
    error: 'Validation failed',
    errors: errors.array()
  });
};

module.exports = {
  handleError,
  handleDatabaseError,
  handleValidationError
};

