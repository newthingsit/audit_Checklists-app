/**
 * Migration script to populate default escalation paths
 * Run this once after creating the escalation_paths table
 */

const db = require('../config/database-loader');
const logger = require('../utils/logger');

const defaultPath = [
  { name: 'Standard', level: 1, role: 'supervisor', days_before_escalation: 3 },
  { name: 'Standard', level: 2, role: 'manager', days_before_escalation: 7 },
  { name: 'Standard', level: 3, role: 'admin', days_before_escalation: 14 }
];

function populateDefaultEscalationPaths() {
  return new Promise((resolve, reject) => {
    const dbInstance = db.getDb();
    
    logger.info('[Migration] Populating default escalation paths...');
    
    let processed = 0;
    const errors = [];
    
    defaultPath.forEach(path => {
      // Check if path already exists
      dbInstance.get(
        `SELECT id FROM escalation_paths WHERE name = ? AND level = ?`,
        [path.name, path.level],
        (err, existing) => {
          if (err) {
            logger.error(`Error checking existing path for ${path.name} level ${path.level}:`, err);
            errors.push({ name: path.name, level: path.level, error: err.message });
            processed++;
            if (processed === defaultPath.length) {
              finish();
            }
            return;
          }
          
          if (existing) {
            logger.info(`[Migration] Path ${path.name} level ${path.level} already exists, skipping`);
            processed++;
            if (processed === defaultPath.length) {
              finish();
            }
            return;
          }
          
          // Insert new path
          dbInstance.run(
            `INSERT INTO escalation_paths (name, level, role, days_before_escalation, is_active)
             VALUES (?, ?, ?, ?, 1)`,
            [path.name, path.level, path.role, path.days_before_escalation],
            function(insertErr) {
              if (insertErr) {
                logger.error(`Error inserting path ${path.name} level ${path.level}:`, insertErr);
                errors.push({ name: path.name, level: path.level, error: insertErr.message });
              } else {
                logger.info(`[Migration] Created path: ${path.name} Level ${path.level} → ${path.role} (${path.days_before_escalation} days)`);
              }
              
              processed++;
              if (processed === defaultPath.length) {
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
        logger.info('[Migration] Successfully populated default escalation paths');
        resolve();
      }
    }
  });
}

// Run migration if called directly
if (require.main === module) {
  populateDefaultEscalationPaths()
    .then(() => {
      logger.info('[Migration] Migration completed successfully');
      process.exit(0);
    })
    .catch(err => {
      logger.error('[Migration] Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { populateDefaultEscalationPaths };
