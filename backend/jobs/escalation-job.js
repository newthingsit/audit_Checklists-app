const db = require('../config/database-loader');
const { checkAndEscalateActions } = require('../utils/escalationWorkflows');
const logger = require('../utils/logger');

/**
 * Scheduled job to check and escalate overdue action items
 * Should be run daily (e.g., via node-cron at 9 AM)
 */
const runEscalationCheck = async () => {
  try {
    const dbInstance = db.getDb();
    const escalationDays = parseInt(process.env.ESCALATION_DAYS || '3', 10);

    logger.info(`[Escalation Job] Starting escalation check (escalation threshold: ${escalationDays} days)...`);

    checkAndEscalateActions(
      dbInstance,
      { escalationDays },
      (err, escalated) => {
        if (err) {
          logger.error('[Escalation Job] Error during escalation check:', err);
          return;
        }

        if (escalated && escalated.length > 0) {
          logger.info(`[Escalation Job] Successfully escalated ${escalated.length} action item(s)`);
        } else {
          logger.info('[Escalation Job] No action items required escalation');
        }
      }
    );
  } catch (error) {
    logger.error('[Escalation Job] Fatal error:', error);
  }
};

module.exports = {
  runEscalationCheck
};
