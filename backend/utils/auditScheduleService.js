/**
 * Audit Schedule & Email Service — Handles scheduled-audit lifecycle and
 * completion email notifications.
 *
 * Extracted from routes/audits.js to improve maintainability.
 */

const logger = require('./logger');
const emailService = require('./emailService');
const { getNextScheduledDate } = require('./auditHelpers');

// -----------------------------------------------------------------------
// markScheduledAuditInProgress
// -----------------------------------------------------------------------

const markScheduledAuditInProgress = (dbInstance, scheduleId) => {
  if (!scheduleId) return;
  dbInstance.run(
    'UPDATE scheduled_audits SET status = ? WHERE id = ?',
    ['in_progress', scheduleId],
    (err) => {
      if (err) {
        logger.error('Error updating scheduled audit status to in_progress:', err.message);
      }
    }
  );
};

// -----------------------------------------------------------------------
// handleScheduledAuditCompletion
// -----------------------------------------------------------------------

const handleScheduledAuditCompletion = (dbInstance, auditId, auditStatus = null) => {
  const processScheduledAuditUpdate = (scheduleId) => {
    dbInstance.get(
      'SELECT id, frequency, scheduled_date, status FROM scheduled_audits WHERE id = ?',
      [scheduleId],
      (scheduleErr, schedule) => {
        if (scheduleErr) {
          logger.error('Error fetching scheduled audit for completion:', scheduleErr.message);
          return;
        }
        if (!schedule) {
          logger.warn(`[Scheduled Audit Completion] Scheduled audit ${scheduleId} not found`);
          return;
        }

        logger.info(`[Scheduled Audit Completion] Schedule ID: ${scheduleId}, Frequency: ${schedule.frequency}, Current Status: ${schedule.status}, Audit ID: ${auditId}`);

        if (!schedule.frequency || schedule.frequency === 'once') {
          dbInstance.run(
            'UPDATE scheduled_audits SET status = ? WHERE id = ?',
            ['completed', scheduleId],
            function (updateErr) {
              if (updateErr) logger.error(`[Scheduled Audit Completion] Error marking scheduled audit ${scheduleId} as completed:`, updateErr.message);
              else           logger.info(`[Scheduled Audit Completion] Successfully marked schedule ${scheduleId} as completed (rows affected: ${this.changes})`);
            }
          );
        } else {
          const nextDate = getNextScheduledDate(schedule.scheduled_date, schedule.frequency);
          logger.debug(`[Scheduled Audit Completion] Recurring audit - advancing to next date: ${nextDate}`);

          if (!nextDate) {
            dbInstance.run(
              'UPDATE scheduled_audits SET status = ? WHERE id = ?',
              ['pending', scheduleId],
              function (updateErr) {
                if (updateErr) logger.error(`[Scheduled Audit Completion] Error resetting scheduled audit ${scheduleId} status:`, updateErr.message);
                else           logger.info(`[Scheduled Audit Completion] Successfully reset schedule ${scheduleId} to pending (rows affected: ${this.changes})`);
              }
            );
          } else {
            dbInstance.run(
              'UPDATE scheduled_audits SET status = ?, scheduled_date = ?, next_run_date = ? WHERE id = ?',
              ['pending', nextDate, nextDate, scheduleId],
              function (updateErr) {
                if (updateErr) logger.error(`[Scheduled Audit Completion] Error advancing scheduled audit ${scheduleId} date:`, updateErr.message);
                else           logger.info(`[Scheduled Audit Completion] Successfully advanced schedule ${scheduleId} to ${nextDate} with pending status (rows affected: ${this.changes})`);
              }
            );
          }
        }
      }
    );
  };

  if (auditStatus === 'completed') {
    dbInstance.get(
      'SELECT scheduled_audit_id FROM audits WHERE id = ?',
      [auditId],
      (err, auditRow) => {
        if (err) { logger.error('Error fetching audit for schedule completion:', err.message); return; }
        if (!auditRow || !auditRow.scheduled_audit_id) {
          logger.debug(`[Scheduled Audit Completion] Audit ${auditId} has no scheduled_audit_id. Skipping.`);
          return;
        }
        processScheduledAuditUpdate(auditRow.scheduled_audit_id);
      }
    );
  } else {
    dbInstance.get(
      'SELECT scheduled_audit_id, status FROM audits WHERE id = ?',
      [auditId],
      (err, auditRow) => {
        if (err) { logger.error('Error fetching audit for schedule completion:', err.message); return; }
        if (!auditRow) { logger.warn(`[Scheduled Audit Completion] Audit ${auditId} not found`); return; }
        if (auditRow.status !== 'completed') {
          logger.debug(`[Scheduled Audit Completion] Audit ${auditId} status is '${auditRow.status}', not 'completed'. Skipping.`);
          return;
        }
        if (!auditRow.scheduled_audit_id) {
          logger.debug(`[Scheduled Audit Completion] Audit ${auditId} has no scheduled_audit_id. Skipping.`);
          return;
        }
        processScheduledAuditUpdate(auditRow.scheduled_audit_id);
      }
    );
  }
};

// -----------------------------------------------------------------------
// sendAuditCompletionEmail
// -----------------------------------------------------------------------

function sendAuditCompletionEmail(dbInstance, auditId, score) {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';

  const query = isSqlServer
    ? `SELECT a.id, a.status, a.completed_at,
              t.name as template_name, l.name as location_name,
              u.name as auditor_name, u.email as auditor_email,
              m.email as manager_email, m.name as manager_name
       FROM audits a
       LEFT JOIN templates t ON a.template_id = t.id
       LEFT JOIN locations l ON a.location_id = l.id
       LEFT JOIN users u ON a.auditor_id = u.id
       LEFT JOIN users m ON l.manager_id = m.id
       WHERE a.id = @auditId`
    : `SELECT a.id, a.status, a.completed_at,
              t.name as template_name, l.name as location_name,
              u.name as auditor_name, u.email as auditor_email,
              m.email as manager_email, m.name as manager_name
       FROM audits a
       LEFT JOIN templates t ON a.template_id = t.id
       LEFT JOIN locations l ON a.location_id = l.id
       LEFT JOIN users u ON a.auditor_id = u.id
       LEFT JOIN users m ON l.manager_id = m.id
       WHERE a.id = ?`;

  const executeQuery = (cb) => {
    const canUseSqlServer = isSqlServer && dbInstance && typeof dbInstance.request === 'function';
    if (canUseSqlServer) {
      const request = dbInstance.request();
      request.input('auditId', auditId);
      request.query(query, cb);
      return;
    }
    dbInstance.get(query, [auditId], cb);
  };

  executeQuery((err, result) => {
    if (err) { logger.error(`[Audit Completion Email] Error fetching audit details: ${err.message}`); return; }

    const audit = isSqlServer ? (result.recordset?.[0]) : result;
    if (!audit) { logger.warn(`[Audit Completion Email] Audit ${auditId} not found`); return; }

    const recipients = [];
    if (audit.auditor_email) recipients.push(audit.auditor_email);
    if (audit.manager_email && audit.manager_email !== audit.auditor_email) recipients.push(audit.manager_email);
    if (recipients.length === 0) { logger.debug(`[Audit Completion Email] No recipients found for audit ${auditId}`); return; }

    const emailContent = emailService.emailTemplates.auditCompleted(
      audit.auditor_name  || 'Auditor',
      audit.template_name || 'Audit',
      score || 0,
      audit.location_name || 'Location'
    );

    emailService.sendEmail(
      recipients.join(', '),
      emailContent.subject,
      emailContent.text,
      emailContent.html
    ).then(() => {
      logger.info(`[Audit Completion Email] Email sent for audit ${auditId} to ${recipients.join(', ')}`);
    }).catch((emailErr) => {
      logger.error(`[Audit Completion Email] Failed to send email for audit ${auditId}: ${emailErr.message}`);
    });
  });
}

module.exports = {
  markScheduledAuditInProgress,
  handleScheduledAuditCompletion,
  sendAuditCompletionEmail,
};
