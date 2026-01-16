const logger = require('./logger');

/**
 * Assignment Rules System
 * Supports category-based, location-based, and severity-based assignment rules
 */

/**
 * Get assignee based on assignment rules
 * @param {Object} dbInstance - Database instance
 * @param {Object} context - Context for rule evaluation
 * @param {string} context.category - Item category
 * @param {number} context.locationId - Location ID
 * @param {boolean} context.isCritical - Whether item is critical
 * @param {number} context.auditUserId - Audit creator user ID
 * @param {Function} callback - Callback function (err, assignee)
 */
function getAssigneeByRules(dbInstance, context, callback) {
  const { category, locationId, isCritical, auditUserId, templateId } = context;
  
  // Try rules in priority order: Category → Location → Severity → Default
  evaluateCategoryRule(dbInstance, category, locationId, templateId, (err, assignee) => {
    if (err || !assignee) {
      return evaluateLocationRule(dbInstance, locationId, (err, assignee) => {
        if (err || !assignee) {
          return evaluateSeverityRule(dbInstance, isCritical, locationId, (err, assignee) => {
            if (err || !assignee) {
              // Default: Use audit creator
              return getDefaultAssignee(dbInstance, auditUserId, callback);
            }
            callback(null, assignee);
          });
        }
        callback(null, assignee);
      });
    }
    callback(null, assignee);
  });
}

/**
 * Category-based assignment rule
 * Assigns based on item category (e.g., "Food Safety" → Food Safety Manager)
 * Now reads from database assignment_rules table
 */
function evaluateCategoryRule(dbInstance, category, locationId, templateId, callback) {
  if (!category) {
    return callback(null, null);
  }

  // First, try to find a template-specific rule
  // Then fall back to a general category rule
  const query = templateId ? `
    SELECT assigned_role, priority_level
    FROM assignment_rules
    WHERE category = ? AND is_active = 1
      AND (template_id = ? OR template_id IS NULL)
    ORDER BY 
      CASE WHEN template_id = ? THEN 0 ELSE 1 END,
      priority_level DESC
    LIMIT 1
  ` : `
    SELECT assigned_role, priority_level
    FROM assignment_rules
    WHERE category = ? AND is_active = 1 AND template_id IS NULL
    ORDER BY priority_level DESC
    LIMIT 1
  `;

  const params = templateId ? [category.toUpperCase(), templateId, templateId] : [category.toUpperCase()];

  dbInstance.get(query, params, (err, rule) => {
    if (err) {
      logger.error('Error fetching category rule from database:', err);
      // Fall back to hardcoded rules for backward compatibility
      return evaluateCategoryRuleFallback(dbInstance, category, locationId, callback);
    }

    if (!rule || !rule.assigned_role) {
      // No rule found in database, try fallback
      return evaluateCategoryRuleFallback(dbInstance, category, locationId, callback);
    }

    const targetRole = rule.assigned_role;

    // Find user with target role assigned to this location
    const userQuery = locationId ? `
      SELECT u.id, u.name, u.role, u.email
      FROM users u
      INNER JOIN user_locations ul ON u.id = ul.user_id
      WHERE u.role = ? AND ul.location_id = ?
      LIMIT 1
    ` : `
      SELECT id, name, role, email FROM users WHERE role = ? LIMIT 1
    `;

    const userParams = locationId ? [targetRole, locationId] : [targetRole];

    dbInstance.get(userQuery, userParams, (err, user) => {
      if (err) {
        logger.error('Error finding user for category rule:', err);
        return callback(err);
      }
      
      if (user) {
        logger.info(`[Assignment Rules] Category rule matched: ${category} → ${user.name} (${user.role})`);
        return callback(null, user);
      }

      // If no location-specific user, try to find any user with the role
      dbInstance.get(
        'SELECT id, name, role, email FROM users WHERE role = ? LIMIT 1',
        [targetRole],
        (err, user) => {
          if (err) {
            return callback(err);
          }
          if (user) {
            logger.info(`[Assignment Rules] Category rule matched (any location): ${category} → ${user.name} (${user.role})`);
          }
          callback(null, user);
        }
      );
    });
  });
}

/**
 * Fallback to hardcoded category rules (for backward compatibility)
 */
function evaluateCategoryRuleFallback(dbInstance, category, locationId, callback) {
  const categoryRoleMap = {
    'FOOD SAFETY': 'manager',
    'FOOD SAFETY - TRACKING': 'manager',
    'SERVICE - Speed of Service': 'supervisor',
    'SERVICE': 'supervisor',
    'CLEANLINESS': 'supervisor',
    'HYGIENE': 'manager'
  };

  const targetRole = categoryRoleMap[category.toUpperCase()] || null;
  
  if (!targetRole) {
    return callback(null, null);
  }

  // Find user with target role assigned to this location
  const query = locationId ? `
    SELECT u.id, u.name, u.role, u.email
    FROM users u
    INNER JOIN user_locations ul ON u.id = ul.user_id
    WHERE u.role = ? AND ul.location_id = ?
    LIMIT 1
  ` : `
    SELECT id, name, role, email FROM users WHERE role = ? LIMIT 1
  `;

  const params = locationId ? [targetRole, locationId] : [targetRole];

  dbInstance.get(query, params, (err, user) => {
    if (err) {
      logger.error('Error evaluating category rule (fallback):', err);
      return callback(err);
    }
    
    if (user) {
      logger.info(`[Assignment Rules] Category rule matched (fallback): ${category} → ${user.name} (${user.role})`);
      return callback(null, user);
    }

    // If no location-specific user, try to find any user with the role
    dbInstance.get(
      'SELECT id, name, role, email FROM users WHERE role = ? LIMIT 1',
      [targetRole],
      (err, user) => {
        if (err) {
          return callback(err);
        }
        if (user) {
          logger.info(`[Assignment Rules] Category rule matched (fallback, any location): ${category} → ${user.name} (${user.role})`);
        }
        callback(null, user);
      }
    );
  });
}

/**
 * Location-based assignment rule
 * Assigns based on location properties (region, district, etc.)
 */
function evaluateLocationRule(dbInstance, locationId, callback) {
  if (!locationId) {
    return callback(null, null);
  }

  // Get location details (region, district, manager_id)
  dbInstance.get(
    `SELECT l.*, 
            (SELECT u.id FROM users u WHERE u.id = l.manager_id) as manager_id
     FROM locations l
     WHERE l.id = ?`,
    [locationId],
    (err, location) => {
      if (err || !location) {
        return callback(err);
      }

      // Priority 1: Location manager (if manager_id column exists and is set)
      if (location.manager_id) {
        dbInstance.get(
          'SELECT id, name, role, email FROM users WHERE id = ?',
          [location.manager_id],
          (err, manager) => {
            if (!err && manager) {
              logger.info(`[Assignment Rules] Location rule matched: Location ${locationId} → ${manager.name} (Manager)`);
              return callback(null, manager);
            }
            
            // Priority 2: User assigned to this location with manager/supervisor role
            return findLocationAssignedUser(dbInstance, locationId, callback);
          }
        );
      } else {
        // No manager_id, try assigned users
        return findLocationAssignedUser(dbInstance, locationId, callback);
      }
    }
  );
}

/**
 * Find user assigned to location with appropriate role
 */
function findLocationAssignedUser(dbInstance, locationId, callback) {
  const query = `
    SELECT u.id, u.name, u.role, u.email
    FROM users u
    INNER JOIN user_locations ul ON u.id = ul.user_id
    WHERE ul.location_id = ? 
      AND u.role IN ('manager', 'supervisor')
    ORDER BY CASE u.role 
      WHEN 'manager' THEN 1 
      WHEN 'supervisor' THEN 2 
      ELSE 3 
    END
    LIMIT 1
  `;

  dbInstance.get(query, [locationId], (err, user) => {
    if (err) {
      return callback(err);
    }
    if (user) {
      logger.info(`[Assignment Rules] Location rule matched: Location ${locationId} → ${user.name} (${user.role})`);
    }
    callback(null, user);
  });
}

/**
 * Severity-based assignment rule
 * Assigns based on item criticality (critical items → higher priority assignee)
 */
function evaluateSeverityRule(dbInstance, isCritical, locationId, callback) {
  if (!isCritical) {
    return callback(null, null);
  }

  // Critical items should go to manager or supervisor
  const query = locationId ? `
    SELECT u.id, u.name, u.role, u.email
    FROM users u
    INNER JOIN user_locations ul ON u.id = ul.user_id
    WHERE ul.location_id = ? 
      AND u.role IN ('manager', 'supervisor')
    ORDER BY CASE u.role 
      WHEN 'manager' THEN 1 
      WHEN 'supervisor' THEN 2 
      ELSE 3 
    END
    LIMIT 1
  ` : `
    SELECT id, name, role, email 
    FROM users 
    WHERE role IN ('manager', 'supervisor')
    ORDER BY CASE role 
      WHEN 'manager' THEN 1 
      WHEN 'supervisor' THEN 2 
      ELSE 3 
    END
    LIMIT 1
  `;

  const params = locationId ? [locationId] : [];

  dbInstance.get(query, params, (err, user) => {
    if (err) {
      return callback(err);
    }
    if (user) {
      logger.info(`[Assignment Rules] Severity rule matched: Critical item → ${user.name} (${user.role})`);
    }
    callback(null, user);
  });
}

/**
 * Default assignee (fallback)
 * Uses audit creator as last resort
 */
function getDefaultAssignee(dbInstance, auditUserId, callback) {
  if (!auditUserId) {
    return callback(null, null);
  }

  dbInstance.get(
    'SELECT id, name, role, email FROM users WHERE id = ?',
    [auditUserId],
    (err, user) => {
      if (err) {
        return callback(err);
      }
      if (user) {
        logger.info(`[Assignment Rules] Default rule: Audit creator → ${user.name}`);
      }
      callback(null, user);
    }
  );
}

module.exports = {
  getAssigneeByRules,
  evaluateCategoryRule,
  evaluateLocationRule,
  evaluateSeverityRule
};
