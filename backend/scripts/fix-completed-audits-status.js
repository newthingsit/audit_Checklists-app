/**
 * Script to fix scheduled audit status for all completed audits
 * This fixes the issue where audits are completed but scheduled audit status is still 'in_progress'
 * 
 * Usage: 
 *   node scripts/fix-completed-audits-status.js                    # Fix all
 *   node scripts/fix-completed-audits-status.js <audit_id>       # Fix specific audit
 *   node scripts/fix-completed-audits-status.js --dry-run         # Preview changes only
 */

require('dotenv').config();
const db = require('../config/database-loader');

const auditId = process.argv[2];
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

async function init() {
  console.log('Initializing database connection...');
  await db.init();
  return db.getDb();
}

function getNextScheduledDate(currentDate, frequency) {
  if (!currentDate || !frequency) return null;
  const date = new Date(currentDate);
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      return null;
  }
  return date.toISOString().split('T')[0];
}

async function fixScheduledAuditStatus(dbInstance, audit) {
  return new Promise((resolve, reject) => {
    // Get the scheduled audit
    dbInstance.get(
      'SELECT id, frequency, scheduled_date, status FROM scheduled_audits WHERE id = ?',
      [audit.scheduled_audit_id],
      (err, scheduledAudit) => {
        if (err) {
          return reject(err);
        }
        if (!scheduledAudit) {
          return resolve({ fixed: false, reason: 'Scheduled audit not found' });
        }

        // Check if scheduled audit status needs to be updated
        const needsUpdate = scheduledAudit.status === 'in_progress' || 
                           scheduledAudit.status === null ||
                           (scheduledAudit.status !== 'completed' && (!scheduledAudit.frequency || scheduledAudit.frequency === 'once'));

        if (!needsUpdate) {
          return resolve({ fixed: false, reason: 'Status already correct' });
        }

        if (isDryRun) {
          console.log(`  [DRY RUN] Would update scheduled audit ${scheduledAudit.id} from '${scheduledAudit.status}' to 'completed'`);
          return resolve({ fixed: true, dryRun: true });
        }

        // Update based on frequency
        if (!scheduledAudit.frequency || scheduledAudit.frequency === 'once') {
          // One-time audit: mark as completed
          dbInstance.run(
            'UPDATE scheduled_audits SET status = ? WHERE id = ?',
            ['completed', scheduledAudit.id],
            function(updateErr) {
              if (updateErr) {
                return reject(updateErr);
              }
              console.log(`  ✓ Updated scheduled audit ${scheduledAudit.id} to 'completed' (rows affected: ${this.changes})`);
              resolve({ fixed: true, scheduledAuditId: scheduledAudit.id, newStatus: 'completed' });
            }
          );
        } else {
          // Recurring audit: advance to next date and reset to pending
          const nextDate = getNextScheduledDate(scheduledAudit.scheduled_date, scheduledAudit.frequency);
          if (!nextDate) {
            // Can't calculate next date, just mark as pending
            dbInstance.run(
              'UPDATE scheduled_audits SET status = ? WHERE id = ?',
              ['pending', scheduledAudit.id],
              function(updateErr) {
                if (updateErr) {
                  return reject(updateErr);
                }
                console.log(`  ✓ Updated scheduled audit ${scheduledAudit.id} to 'pending' (rows affected: ${this.changes})`);
                resolve({ fixed: true, scheduledAuditId: scheduledAudit.id, newStatus: 'pending' });
              }
            );
          } else {
            dbInstance.run(
              'UPDATE scheduled_audits SET status = ?, scheduled_date = ?, next_run_date = ? WHERE id = ?',
              ['pending', nextDate, nextDate, scheduledAudit.id],
              function(updateErr) {
                if (updateErr) {
                  return reject(updateErr);
                }
                console.log(`  ✓ Updated scheduled audit ${scheduledAudit.id} to 'pending' with next date ${nextDate} (rows affected: ${this.changes})`);
                resolve({ fixed: true, scheduledAuditId: scheduledAudit.id, newStatus: 'pending', nextDate });
              }
            );
          }
        }
      }
    );
  });
}

async function fixCompletedAudits() {
  try {
    const dbInstance = await init();
    
    console.log('\n' + '='.repeat(60));
    console.log('Fix Completed Audits - Scheduled Audit Status');
    console.log('='.repeat(60));
    
    if (isDryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
    }

    let query;
    let params = [];

    if (auditId && !isNaN(parseInt(auditId))) {
      // Fix specific audit
      query = `SELECT a.id, a.status, a.scheduled_audit_id, a.restaurant_name, a.location, 
                      sa.status as scheduled_status, sa.frequency
               FROM audits a
               LEFT JOIN scheduled_audits sa ON a.scheduled_audit_id = sa.id
               WHERE a.id = ? AND a.status = 'completed' AND a.scheduled_audit_id IS NOT NULL`;
      params = [parseInt(auditId)];
      console.log(`\nFixing specific audit ID: ${auditId}`);
    } else {
      // Fix all completed audits with scheduled_audit_id
      query = `SELECT a.id, a.status, a.scheduled_audit_id, a.restaurant_name, a.location,
                      sa.status as scheduled_status, sa.frequency
               FROM audits a
               LEFT JOIN scheduled_audits sa ON a.scheduled_audit_id = sa.id
               WHERE a.status = 'completed' 
                 AND a.scheduled_audit_id IS NOT NULL
                 AND (sa.status = 'in_progress' OR sa.status IS NULL OR 
                      (sa.frequency IS NULL OR sa.frequency = 'once') AND sa.status != 'completed')`;
      console.log('\nFinding all completed audits with incorrect scheduled audit status...');
    }

    const audits = await new Promise((resolve, reject) => {
      dbInstance.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    if (audits.length === 0) {
      console.log('\n✓ No audits found that need fixing.');
      process.exit(0);
    }

    console.log(`\nFound ${audits.length} audit(s) that need fixing:\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const audit of audits) {
      console.log(`Audit ID: ${audit.id}`);
      console.log(`  Restaurant: ${audit.restaurant_name || audit.location || 'N/A'}`);
      console.log(`  Scheduled Audit ID: ${audit.scheduled_audit_id}`);
      console.log(`  Current Scheduled Status: ${audit.scheduled_status || 'NULL'}`);
      console.log(`  Frequency: ${audit.frequency || 'once'}`);

      try {
        const result = await fixScheduledAuditStatus(dbInstance, audit);
        if (result.fixed) {
          fixedCount++;
        } else {
          skippedCount++;
          console.log(`  ⚠️  Skipped: ${result.reason}`);
        }
      } catch (error) {
        console.error(`  ✗ Error fixing audit ${audit.id}:`, error.message);
        skippedCount++;
      }
      console.log('');
    }

    console.log('='.repeat(60));
    console.log(`Summary:`);
    console.log(`  Total audits checked: ${audits.length}`);
    console.log(`  Fixed: ${fixedCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    if (isDryRun) {
      console.log(`\n⚠️  This was a DRY RUN - no actual changes were made.`);
      console.log(`   Run without --dry-run to apply changes.`);
    } else {
      console.log(`\n✓ Done!`);
    }
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error);
    process.exit(1);
  }
}

fixCompletedAudits();

