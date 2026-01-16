/**
 * Migration script to populate initial assignment rules
 * Run this once after creating the assignment_rules table
 */

const db = require('../config/database-loader');
const logger = require('../utils/logger');

const initialRules = [
  { category: 'FOOD SAFETY', assigned_role: 'manager', priority_level: 10 },
  { category: 'FOOD SAFETY - TRACKING', assigned_role: 'manager', priority_level: 10 },
  { category: 'SERVICE - Speed of Service', assigned_role: 'supervisor', priority_level: 5 },
  { category: 'SERVICE', assigned_role: 'supervisor', priority_level: 5 },
  { category: 'CLEANLINESS', assigned_role: 'supervisor', priority_level: 5 },
  { category: 'HYGIENE', assigned_role: 'manager', priority_level: 8 }
];

function populateInitialRules() {
  return new Promise((resolve, reject) => {
    const dbInstance = db.getDb();
    
    logger.info('[Migration] Populating initial assignment rules...');
    
    let processed = 0;
    const errors = [];
    
    initialRules.forEach(rule => {
      // Check if rule already exists
      dbInstance.get(
        `SELECT id FROM assignment_rules WHERE category = ? AND template_id IS NULL`,
        [rule.category],
        (err, existing) => {
          if (err) {
            logger.error(`Error checking existing rule for ${rule.category}:`, err);
            errors.push({ category: rule.category, error: err.message });
            processed++;
            if (processed === initialRules.length) {
              finish();
            }
            return;
          }
          
          if (existing) {
            logger.info(`[Migration] Rule for ${rule.category} already exists, skipping`);
            processed++;
            if (processed === initialRules.length) {
              finish();
            }
            return;
          }
          
          // Insert new rule
          dbInstance.run(
            `INSERT INTO assignment_rules (category, assigned_role, template_id, priority_level, is_active)
             VALUES (?, ?, NULL, ?, 1)`,
            [rule.category, rule.assigned_role, rule.priority_level],
            function(insertErr) {
              if (insertErr) {
                logger.error(`Error inserting rule for ${rule.category}:`, insertErr);
                errors.push({ category: rule.category, error: insertErr.message });
              } else {
                logger.info(`[Migration] Created rule: ${rule.category} → ${rule.assigned_role}`);
              }
              
              processed++;
              if (processed === initialRules.length) {
                finish();
              }
            }
          );
        }
      );
    });
    
    function finish() {
      if (errors.length > 0) {
        logger.warn(`[Migration] Completed with ${errors.length} errors`);
        logger.warn('Errors:', errors);
        reject(new Error(`Migration completed with ${errors.length} errors`));
      } else {
        logger.info('[Migration] Successfully populated initial assignment rules');
        resolve();
      }
    }
  });
}

// Run migration if called directly
if (require.main === module) {
  populateInitialRules()
    .then(() => {
      logger.info('[Migration] Migration completed successfully');
      process.exit(0);
    })
    .catch(err => {
      logger.error('[Migration] Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { populateInitialRules };
