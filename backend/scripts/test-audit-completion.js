const db = require('../config/database-loader');
const logger = require('../utils/logger');

async function testAuditCompletion(auditId) {
  try {
    const dbInstance = db.getDb();
    
    console.log(`\n=== Testing Audit Completion for Audit #${auditId} ===\n`);
    
    // Get audit details
    dbInstance.get('SELECT * FROM audits WHERE id = ?', [auditId], (err, audit) => {
      if (err || !audit) {
        console.error('Error fetching audit:', err);
        process.exit(1);
      }
      
      console.log(`Audit: ${audit.restaurant_name}`);
      console.log(`Current Status: ${audit.status}`);
      console.log(`Template ID: ${audit.template_id}`);
      console.log(`Total Items (from audit): ${audit.total_items}`);
      console.log(`Completed Items (from audit): ${audit.completed_items}\n`);
      
      // Get all template items
      dbInstance.all(
        'SELECT id, title, category FROM checklist_items WHERE template_id = ? ORDER BY category, order_index',
        [audit.template_id],
        (err, templateItems) => {
          if (err) {
            console.error('Error fetching template items:', err);
            process.exit(1);
          }
          
          console.log(`Total Template Items: ${templateItems.length}\n`);
          
          // Get all audit items
          dbInstance.all(
            'SELECT item_id, mark, status, selected_option_id FROM audit_items WHERE audit_id = ?',
            [auditId],
            (err, auditItems) => {
              if (err) {
                console.error('Error fetching audit items:', err);
                process.exit(1);
              }
              
              console.log(`Total Audit Items: ${auditItems.length}\n`);
              
              // Create map of audit items
              const auditItemMap = {};
              auditItems.forEach(item => {
                auditItemMap[item.item_id] = item;
              });
              
              // Group by category
              const categoryGroups = {};
              templateItems.forEach(item => {
                const category = item.category || 'Uncategorized';
                if (!categoryGroups[category]) {
                  categoryGroups[category] = [];
                }
                categoryGroups[category].push(item);
              });
              
              // Check each category
              let totalCompleted = 0;
              let totalMissing = 0;
              
              console.log('=== Category-wise Analysis ===\n');
              
              Object.keys(categoryGroups).forEach(category => {
                const items = categoryGroups[category];
                let categoryCompleted = 0;
                let categoryMissing = 0;
                const missingItems = [];
                
                items.forEach(templateItem => {
                  const auditItem = auditItemMap[templateItem.id];
                  
                  if (!auditItem) {
                    categoryMissing++;
                    missingItems.push(templateItem.id);
                  } else {
                    const markValue = auditItem.mark;
                    const hasMark = markValue !== null && 
                                   markValue !== undefined && 
                                   String(markValue).trim() !== '';
                    const isNA = markValue === 'NA' || 
                                String(markValue).toUpperCase().trim() === 'NA' ||
                                String(markValue).toUpperCase().trim() === 'N/A';
                    
                    if (hasMark || isNA) {
                      categoryCompleted++;
                    } else {
                      categoryMissing++;
                      missingItems.push(templateItem.id);
                    }
                  }
                });
                
                const categoryStatus = categoryCompleted === items.length ? '✅ COMPLETE' : '❌ INCOMPLETE';
                console.log(`${categoryStatus} - ${category}:`);
                console.log(`  Items: ${categoryCompleted}/${items.length} completed`);
                if (categoryMissing > 0) {
                  console.log(`  Missing: ${categoryMissing} items`);
                  if (missingItems.length <= 5) {
                    console.log(`  Item IDs: ${missingItems.join(', ')}`);
                  }
                }
                console.log('');
                
                totalCompleted += categoryCompleted;
                totalMissing += categoryMissing;
              });
              
              console.log('=== Overall Summary ===\n');
              console.log(`Total Template Items: ${templateItems.length}`);
              console.log(`Completed Items: ${totalCompleted}`);
              console.log(`Missing/Incomplete Items: ${totalMissing}`);
              console.log(`\nExpected Status: ${totalCompleted === templateItems.length && templateItems.length > 0 ? 'completed' : 'in_progress'}`);
              console.log(`Actual Status: ${audit.status}`);
              
              if (totalCompleted === templateItems.length && templateItems.length > 0 && audit.status !== 'completed') {
                console.log('\n⚠️  ISSUE: Audit should be completed but status is not "completed"');
              } else if (totalCompleted < templateItems.length && audit.status === 'completed') {
                console.log('\n⚠️  ISSUE: Audit status is "completed" but not all items are completed!');
                console.log(`   Missing ${totalMissing} items`);
                
                // Fix the status
                console.log('\n🔧 Fixing audit status...');
                dbInstance.run(
                  'UPDATE audits SET status = ?, completed_at = NULL WHERE id = ?',
                  ['in_progress', auditId],
                  (updateErr) => {
                    if (updateErr) {
                      console.error('Error updating status:', updateErr);
                    } else {
                      console.log('✅ Status updated to "in_progress"');
                    }
                    process.exit(0);
                  }
                );
              } else {
                console.log('\n✅ Status is correct!');
                process.exit(0);
              }
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get audit ID from command line
const auditId = process.argv[2];
if (!auditId) {
  console.error('Usage: node test-audit-completion.js <audit_id>');
  console.error('Example: node test-audit-completion.js 137');
  process.exit(1);
}

testAuditCompletion(parseInt(auditId, 10));

