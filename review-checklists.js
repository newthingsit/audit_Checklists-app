const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const db = require(path.join(__dirname, 'backend', 'config', 'database-loader'));

const dbInstance = db.getDb();

console.log('\n════════════════════════════════════════════════════════════════');
console.log('🔍 CHECKLIST TEMPLATES & OPTIONS REVIEW');
console.log('════════════════════════════════════════════════════════════════\n');

let completed = 0;
let itemsToShow = [];

dbInstance.all(
  'SELECT TOP 10 id, name, category FROM checklist_templates ORDER BY id DESC',
  [],
  (err, templates) => {
    if (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
    
    console.log('📋 RECENT TEMPLATES:\n');
    templates.forEach(t => {
      console.log(`  [${t.id}] ${t.name}`);
      console.log(`       Category: ${t.category}\n`);
    });
    
    // Check template 44 (QA-QSR) with the issue
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('🔎 TEMPLATE 44 (QA - QSR CHECKLIST) - DETAILED REVIEW');
    console.log('════════════════════════════════════════════════════════════════\n');
    
    dbInstance.all(
      `SELECT TOP 5 ci.id, ci.title, ci.input_type, ci.category
       FROM checklist_items ci
       WHERE ci.template_id = 44
       ORDER BY ci.id`,
      [],
      (err2, items) => {
        if (err2) {
          console.error('Error:', err2.message);
          process.exit(1);
        }
        
        items.forEach((item, idx) => {
          console.log(`\n[Item ${item.id}] ${item.title}`);
          console.log(`Input Type: ${item.input_type} | Category: ${item.category}`);
          console.log('Options:');
          
          dbInstance.all(
            `SELECT id, option_text, mark, order_index FROM checklist_item_options WHERE item_id = ? ORDER BY order_index`,
            [item.id],
            (err3, options) => {
              if (err3) {
                console.error('  Error fetching options:', err3.message);
              } else if (options && options.length > 0) {
                options.forEach(opt => {
                  console.log(`  ✓ "${opt.option_text}" (mark: ${opt.mark})`);
                });
              } else {
                console.log('  ⚠️  NO OPTIONS FOUND!');
              }
              
              completed++;
              if (completed === items.length) {
                console.log('\n════════════════════════════════════════════════════════════════\n');
                testAuditCreation();
              }
            }
          );
        });
      }
    );
  }
);

function testAuditCreation() {
  console.log('🧪 AUDIT CREATION TEST\n');
  
  // Check if there are any audits for template 44
  dbInstance.all(
    `SELECT TOP 3 id, status, completed_items, total_items, score FROM audits WHERE template_id = 44 ORDER BY created_at DESC`,
    [],
    (err, audits) => {
      if (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
      
      if (audits.length === 0) {
        console.log('No audits found for Template 44');
      } else {
        console.log('Recent Audits for Template 44:\n');
        audits.forEach(audit => {
          console.log(`  Audit ID: ${audit.id}`);
          console.log(`  Status: ${audit.status}`);
          console.log(`  Progress: ${audit.completed_items}/${audit.total_items}`);
          console.log(`  Score: ${audit.score}%\n`);
        });
      }
      
      testAPIEndpoint();
    }
  );
}

function testAPIEndpoint() {
  console.log('🌐 API ENDPOINT TEST\n');
  console.log('Testing GET /api/checklists/44 response structure...\n');
  
  const axios = require('axios');
  
  axios.get('http://localhost:5000/api/checklists/44', { validateStatus: () => true })
    .then(response => {
      if (response.status === 200) {
        const data = response.data;
        console.log(`✅ API Response Status: ${response.status}`);
        console.log(`Items returned: ${data.items ? data.items.length : 0}\n`);
        
        if (data.items && data.items.length > 0) {
          console.log('First Item in Response:');
          const firstItem = data.items[0];
          console.log(`  ID: ${firstItem.id}`);
          console.log(`  Title: ${firstItem.title}`);
          console.log(`  Input Type: ${firstItem.input_type}`);
          console.log(`  Options present: ${firstItem.options ? 'YES ✅' : 'NO ❌'}`);
          
          if (firstItem.options) {
            console.log(`  Option count: ${firstItem.options.length}`);
            firstItem.options.slice(0, 3).forEach(opt => {
              console.log(`    • ${opt.option_text}: ${opt.mark}`);
            });
          }
        }
      } else {
        console.log(`⚠️  API Response Status: ${response.status}`);
        console.log('Response:', response.data);
      }
    })
    .catch(err => {
      console.log(`❌ Cannot connect to API: ${err.message}`);
      console.log('(Backend might not be running on localhost:5000)');
    })
    .finally(() => {
      process.exit(0);
    });
}
