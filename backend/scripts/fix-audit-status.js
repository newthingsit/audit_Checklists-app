/**
 * Script to check and fix audit status for a scheduled audit
 * Usage: node scripts/fix-audit-status.js <scheduled_audit_id>
 */

require('dotenv').config();
const db = require('../config/database-loader');

const scheduledAuditId = process.argv[2] || 21;

async function init() {
  console.log('Initializing database connection...');
  await db.init();
  return db.getDb();
}

async function checkAndFixAuditStatus() {
  try {
    const dbInstance = await init();
    
    console.log(`\nChecking scheduled audit ID: ${scheduledAuditId}`);
    console.log('='.repeat(50));
    
    // Get the scheduled audit
    const scheduledAudit = await new Promise((resolve, reject) => {
      dbInstance.get(
        'SELECT * FROM scheduled_audits WHERE id = ?',
        [scheduledAuditId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
    
    if (!scheduledAudit) {
      console.log('Scheduled audit not found!');
      process.exit(1);
    }
    
    console.log('Scheduled Audit:', {
      id: scheduledAudit.id,
      status: scheduledAudit.status,
      frequency: scheduledAudit.frequency,
      scheduled_date: scheduledAudit.scheduled_date
    });
    
    // Get the linked audit
    const audit = await new Promise((resolve, reject) => {
      dbInstance.get(
        'SELECT * FROM audits WHERE scheduled_audit_id = ? ORDER BY created_at DESC',
        [scheduledAuditId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
    
    if (!audit) {
      console.log('\nNo audit found for this scheduled audit!');
      process.exit(1);
    }
    
    console.log('\nLinked Audit:', {
      id: audit.id,
      status: audit.status,
      total_items: audit.total_items,
      completed_items: audit.completed_items,
      score: audit.score
    });
    
    // Get audit items
    const auditItems = await new Promise((resolve, reject) => {
      dbInstance.all(
        'SELECT * FROM audit_items WHERE audit_id = ?',
        [audit.id],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });
    
    console.log(`\nAudit Items: ${auditItems.length} total`);
    
    // Check completion status of each item
    let itemsWithMark = 0;
    let itemsWithOption = 0;
    let itemsCompleted = 0;
    
    auditItems.forEach(item => {
      if (item.mark !== null && item.mark !== undefined && item.mark !== '') {
        itemsWithMark++;
      }
      if (item.selected_option_id) {
        itemsWithOption++;
      }
      if (item.status === 'completed') {
        itemsCompleted++;
      }
    });
    
    console.log(`Items with mark: ${itemsWithMark}`);
    console.log(`Items with selected option: ${itemsWithOption}`);
    console.log(`Items with 'completed' status: ${itemsCompleted}`);
    
    // Show sample items
    console.log('\nSample items (first 5):');
    auditItems.slice(0, 5).forEach(item => {
      console.log(`  Item ${item.item_id}: mark=${item.mark}, status=${item.status}, option_id=${item.selected_option_id}`);
    });
    
    // Check if audit should be marked as completed
    const shouldBeCompleted = itemsWithMark === audit.total_items || 
                              itemsWithOption === audit.total_items ||
                              itemsCompleted === audit.total_items;
    
    console.log(`\nAudit should be completed: ${shouldBeCompleted}`);
    console.log(`Current audit status: ${audit.status}`);
    console.log(`Current scheduled audit status: ${scheduledAudit.status}`);
    
    if (shouldBeCompleted && audit.status !== 'completed') {
      console.log('\n*** FIX NEEDED: Audit should be completed but is not ***');
      
      // Update audit status
      await new Promise((resolve, reject) => {
        dbInstance.run(
          "UPDATE audits SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [audit.id],
          (err) => err ? reject(err) : resolve()
        );
      });
      console.log('✓ Audit status updated to "completed"');
      
      // Update scheduled audit status based on frequency
      if (scheduledAudit.frequency === 'once') {
        await new Promise((resolve, reject) => {
          dbInstance.run(
            "UPDATE scheduled_audits SET status = 'completed' WHERE id = ?",
            [scheduledAuditId],
            (err) => err ? reject(err) : resolve()
          );
        });
        console.log('✓ Scheduled audit status updated to "completed"');
      } else {
        // For recurring audits, advance the date
        const nextDate = getNextScheduledDate(scheduledAudit.scheduled_date, scheduledAudit.frequency);
        await new Promise((resolve, reject) => {
          dbInstance.run(
            "UPDATE scheduled_audits SET status = 'pending', scheduled_date = ?, next_run_date = ? WHERE id = ?",
            [nextDate, nextDate, scheduledAuditId],
            (err) => err ? reject(err) : resolve()
          );
        });
        console.log(`✓ Scheduled audit status reset to "pending" with next date: ${nextDate}`);
      }
    } else if (shouldBeCompleted && audit.status === 'completed') {
      // Audit is completed, but scheduled audit status might be wrong
      if (scheduledAudit.status === 'in_progress') {
        console.log('\n*** FIX NEEDED: Audit is completed but scheduled audit shows in_progress ***');
        
        if (scheduledAudit.frequency === 'once') {
          await new Promise((resolve, reject) => {
            dbInstance.run(
              "UPDATE scheduled_audits SET status = 'completed' WHERE id = ?",
              [scheduledAuditId],
              (err) => err ? reject(err) : resolve()
            );
          });
          console.log('✓ Scheduled audit status updated to "completed"');
        } else {
          const nextDate = getNextScheduledDate(scheduledAudit.scheduled_date, scheduledAudit.frequency);
          await new Promise((resolve, reject) => {
            dbInstance.run(
              "UPDATE scheduled_audits SET status = 'pending', scheduled_date = ?, next_run_date = ? WHERE id = ?",
              [nextDate, nextDate, scheduledAuditId],
              (err) => err ? reject(err) : resolve()
            );
          });
          console.log(`✓ Scheduled audit status reset to "pending" with next date: ${nextDate}`);
        }
      }
    } else {
      console.log('\nNo fixes needed - status is correct.');
    }
    
    console.log('\n✓ Done!');
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

function getNextScheduledDate(currentDate, frequency) {
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

checkAndFixAuditStatus();

