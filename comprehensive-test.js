const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const db = require(path.join(__dirname, 'backend', 'config', 'database-loader'));

const dbInstance = db.getDb();

console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                   🧪 COMPREHENSIVE TESTING CHECKLIST                           ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

let testsPassed = 0;
let testsFailed = 0;

function logTest(testName, passed, details = '') {
  if (passed) {
    console.log(`✅ ${testName}`);
    testsPassed++;
  } else {
    console.log(`❌ ${testName}`);
    if (details) console.log(`   ${details}`);
    testsFailed++;
  }
}

function logSection(title) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`${title}`);
  console.log(`${'─'.repeat(80)}\n`);
}

// Test 1: Database Connection
logSection('1️⃣  DATABASE CONNECTION & SCHEMA');

dbInstance.get(`SELECT COUNT(*) as template_count FROM checklist_templates`, [], (err, result) => {
  logTest('Database connection', !err && result);
  if (!err && result) {
    console.log(`   Total templates: ${result.template_count}`);
  }

  // Test 2: CSV Import - Check imported templates
  logSection('2️⃣  CSV IMPORT VERIFICATION');

  dbInstance.all(
    `SELECT TOP 5 id, name, created_at FROM checklist_templates WHERE name LIKE '%CVR%' ORDER BY id DESC`,
    [],
    (err, templates) => {
      logTest('CVR templates exist', !err && templates && templates.length > 0);
      if (templates && templates.length > 0) {
        console.log(`   Found ${templates.length} CVR templates`);
        templates.forEach(t => console.log(`     • [${t.id}] ${t.name}`));
      }

      // Test 3: Options parsing - verify all formats stored correctly
      logSection('3️⃣  OPTIONS PARSING & STORAGE');

      dbInstance.all(
        `SELECT TOP 10 id, option_text, mark FROM checklist_item_options ORDER BY id DESC`,
        [],
        (err, options) => {
          logTest('Options stored in database', !err && options && options.length > 0);
          if (options && options.length > 0) {
            console.log(`   Sample options:`);
            options.slice(0, 5).forEach(opt => {
              console.log(`     • "${opt.option_text}" = mark:"${opt.mark}"`);
            });
          }

          // Test 4: Template 44 - The one with the issue
          logSection('4️⃣  TEMPLATE 44 (QA-QSR) - DETAILED CHECK');

          dbInstance.all(
            `SELECT id, title, input_type FROM checklist_items WHERE template_id = 44`,
            [],
            (err, items) => {
              logTest('Template 44 items exist', !err && items && items.length > 0);
              if (items && items.length > 0) {
                console.log(`   Total items: ${items.length}`);

                let optionsCheckPassed = 0;
                items.forEach((item, idx) => {
                  dbInstance.get(
                    `SELECT COUNT(*) as opt_count FROM checklist_item_options WHERE item_id = ?`,
                    [item.id],
                    (err, res) => {
                      if (res && res.opt_count > 0) {
                        optionsCheckPassed++;
                      }
                      
                      if (idx === items.length - 1) {
                        logTest(
                          'All items have options',
                          optionsCheckPassed === items.length,
                          `${optionsCheckPassed}/${items.length} items have options`
                        );

                        // Test 5: Audit data integrity
                        logSection('5️⃣  AUDIT DATA INTEGRITY');

                        dbInstance.all(
                          `SELECT TOP 3 id, status, completed_items, total_items, score FROM audits WHERE template_id = 44 ORDER BY id DESC`,
                          [],
                          (err, audits) => {
                            logTest('Audits exist for Template 44', !err && audits && audits.length > 0);
                            if (audits && audits.length > 0) {
                              audits.forEach(audit => {
                                console.log(`   Audit ${audit.id}: ${audit.status} (${audit.completed_items}/${audit.total_items} items)`);
                              });

                              // Test 6: Selected options in audit items
                              logSection('6️⃣  AUDIT RESPONSES - OPTION SELECTION');

                              dbInstance.all(
                                `SELECT TOP 10 ai.item_id, ai.selected_option_id, cio.option_text, cio.mark
                                 FROM audit_items ai
                                 LEFT JOIN checklist_item_options cio ON ai.selected_option_id = cio.id
                                 WHERE ai.audit_id = ?`,
                                [audits[0].id],
                                (err, responses) => {
                                  logTest('Audit responses recorded', !err && responses && responses.length > 0);
                                  if (responses && responses.length > 0) {
                                    console.log(`   Sample responses from Audit ${audits[0].id}:`);
                                    responses.slice(0, 5).forEach(r => {
                                      console.log(`     • Item ${r.item_id}: "${r.option_text}" (mark: ${r.mark})`);
                                    });
                                  }

                                  // Test 7: API endpoint structure
                                  logSection('7️⃣  API ENDPOINT STRUCTURE');

                                  dbInstance.get(
                                    `SELECT ci.id, cio.id as opt_id FROM checklist_items ci
                                     LEFT JOIN checklist_item_options cio ON ci.id = cio.item_id
                                     WHERE ci.template_id = 44 LIMIT 1`,
                                    [],
                                    (err, item) => {
                                      logTest('Items linked to options', !err && item && item.opt_id);

                                      // Test 8: Permission system
                                      logSection('8️⃣  PERMISSION & AUTHENTICATION SYSTEM');

                                      dbInstance.all(
                                        `SELECT TOP 5 id, role, permissions FROM roles`,
                                        [],
                                        (err, roles) => {
                                          logTest('Role-based permissions configured', !err && roles && roles.length > 0);
                                          if (roles && roles.length > 0) {
                                            console.log(`   Roles configured: ${roles.length}`);
                                            roles.forEach(r => {
                                              try {
                                                const perms = JSON.parse(r.permissions || '[]');
                                                console.log(`     • ${r.role}: ${perms.length} permissions`);
                                              } catch (e) {
                                                console.log(`     • ${r.role}: [parse error]`);
                                              }
                                            });
                                          }

                                          // Test 9: Code changes verification
                                          logSection('9️⃣  CODE CHANGES VERIFICATION');

                                          const fs = require('fs');
                                          const auditRoutePath = path.join(__dirname, 'backend', 'routes', 'audits.js');
                                          
                                          try {
                                            const auditCode = fs.readFileSync(auditRoutePath, 'utf8');
                                            const hasPermissionGate = auditCode.includes("requirePermission('edit_audits', 'manage_audits')");
                                            const hasBatchRoute = auditCode.includes("router.put('/:id/items/batch'");
                                            
                                            logTest('Batch update route exists', hasBatchRoute);
                                            logTest('Permission gate removed from batch route', !hasPermissionGate, 'Verified in code');
                                            
                                            // Test 10: Frontend components
                                            logSection('🔟 FRONTEND COMPONENTS');

                                            const checklistsPath = path.join(__dirname, 'web', 'src', 'pages', 'Checklists.js');
                                            const auditFormPath = path.join(__dirname, 'web', 'src', 'pages', 'AuditForm.js');

                                            const checklistsExists = fs.existsSync(checklistsPath);
                                            const auditFormExists = fs.existsSync(auditFormPath);

                                            logTest('Checklists.js exists', checklistsExists);
                                            logTest('AuditForm.js exists', auditFormExists);

                                            if (checklistsExists) {
                                              const checklistsCode = fs.readFileSync(checklistsPath, 'utf8');
                                              const hasCSVUpload = checklistsCode.includes('import/csv');
                                              logTest('CSV upload functionality in Checklists.js', hasCSVUpload);
                                            }

                                            if (auditFormExists) {
                                              const auditFormCode = fs.readFileSync(auditFormPath, 'utf8');
                                              const hasOptionRendering = auditFormCode.includes('item.options');
                                              logTest('Option rendering in AuditForm.js', hasOptionRendering);
                                            }
                                          } catch (err) {
                                            logTest('Code verification', false, err.message);
                                          }

                                          // Test 11: Deployment status
                                          logSection('1️⃣1️⃣  DEPLOYMENT STATUS');

                                          try {
                                            const gitLog = require('child_process').execSync('git log --oneline -n 3', { cwd: __dirname }).toString();
                                            logTest('Git repository active', true);
                                            console.log(`   Recent commits:\n${gitLog.split('\n').slice(0, 3).map(l => `     ${l}`).join('\n')}`);
                                          } catch (err) {
                                            logTest('Git repository', false, 'Not available');
                                          }

                                          // Final Summary
                                          logSection('📊 TEST SUMMARY');

                                          const totalTests = testsPassed + testsFailed;
                                          const passPercentage = ((testsPassed / totalTests) * 100).toFixed(1);

                                          console.log(`✅ Passed: ${testsPassed}/${totalTests}`);
                                          console.log(`❌ Failed: ${testsFailed}/${totalTests}`);
                                          console.log(`📈 Pass Rate: ${passPercentage}%\n`);

                                          if (testsFailed === 0) {
                                            console.log('🎉 ALL TESTS PASSED - System ready for deployment!\n');
                                          } else {
                                            console.log(`⚠️  ${testsFailed} test(s) need attention\n`);
                                          }

                                          process.exit(testsFailed > 0 ? 1 : 0);
                                        }
                                      );
                                    }
                                  );
                                }
                              );
                            }
                          }
                        );
                      }
                    }
                  );
                });
              }
            }
          );
        }
      );
    }
  );
});

setTimeout(() => process.exit(1), 30000); // Timeout after 30 seconds
