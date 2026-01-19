#!/usr/bin/env node
/**
 * Update Speed of Service items in Template 15 (CVR - CDR) with simpler structure:
 * 
 * Each Trnx section (Trnx-1 to Trnx-4) will have:
 *   - Table Number (text)
 *   - Dish Name (text)
 *   - Time – Attempt 1 to 5 (number)
 * 
 * Avg section will have:
 *   - Average (Auto) - auto-calculated
 *
 * Usage:
 *   node backend/scripts/update-sos-template15.js
 */

require('dotenv').config();
const dbLoader = require('../config/database-loader');

const TEMPLATE_ID = 15;
const CATEGORY = 'SERVICE (Speed of Service)'; // Match existing category name

// Generate items for each transaction section (Trnx-1 to Trnx-4)
function generateTransactionItems(sectionName) {
  return [
    {
      title: 'Table Number',
      inputType: 'short_answer',
      description: 'Enter the table number',
      section: sectionName,
      required: 1
    },
    {
      title: 'Dish Name',
      inputType: 'short_answer',
      description: 'Enter the name of the dish',
      section: sectionName,
      required: 1
    },
    {
      title: 'Time – Attempt 1',
      inputType: 'number',
      description: 'Time in minutes (1st measurement)',
      section: sectionName,
      required: 1
    },
    {
      title: 'Time – Attempt 2',
      inputType: 'number',
      description: 'Time in minutes (2nd measurement)',
      section: sectionName,
      required: 1
    },
    {
      title: 'Time – Attempt 3',
      inputType: 'number',
      description: 'Time in minutes (3rd measurement)',
      section: sectionName,
      required: 1
    },
    {
      title: 'Time – Attempt 4',
      inputType: 'number',
      description: 'Time in minutes (4th measurement)',
      section: sectionName,
      required: 1
    },
    {
      title: 'Time – Attempt 5',
      inputType: 'number',
      description: 'Time in minutes (5th measurement)',
      section: sectionName,
      required: 1
    }
  ];
}

// New simplified items
const ITEMS = [
  ...generateTransactionItems('Trnx-1'),
  ...generateTransactionItems('Trnx-2'),
  ...generateTransactionItems('Trnx-3'),
  ...generateTransactionItems('Trnx-4'),
  {
    title: 'Average (Auto)',
    inputType: 'number',
    description: 'Auto-calculated average from all time measurements',
    section: 'Avg',
    required: 0
  }
];

function runDb(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err, result) {
      if (err) return reject(err);
      const r = result && typeof result === 'object' && ('lastID' in result || 'changes' in result)
        ? result
        : { lastID: this.lastID, changes: this.changes };
      resolve(r);
    });
  });
}

function getDb(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allDb(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function main() {
  console.log('🔄 Updating Speed of Service in Template 15 (CVR - CDR)...\n');

  try {
    if (dbLoader.init) await dbLoader.init();
    const db = dbLoader.getDb();

    // 1) Verify template exists
    const template = await getDb(db, 'SELECT id, name FROM checklist_templates WHERE id = ?', [TEMPLATE_ID]);
    if (!template) {
      console.error('   Template 15 not found!');
      process.exit(1);
    }
    console.log(`   ✅ Template: "${template.name}" (ID: ${template.id})`);

    // 2) Find and remove existing Speed of Service items
    const existing = await allDb(
      db, 
      'SELECT id, title, section FROM checklist_items WHERE template_id = ? AND category LIKE ?', 
      [TEMPLATE_ID, '%Speed%']
    );
    
    console.log(`   📊 Found ${existing.length} existing Speed of Service items`);

    if (existing.length > 0) {
      console.log('   🧹 Removing old items...');
      for (const r of existing) {
        await runDb(db, 'DELETE FROM checklist_item_options WHERE item_id = ?', [r.id]);
        await runDb(db, 'DELETE FROM checklist_items WHERE id = ?', [r.id]);
      }
      console.log(`   ✅ Removed ${existing.length} items\n`);
    }

    // 3) Get the max order_index for this template to append after other items
    const maxOrder = await getDb(
      db, 
      'SELECT MAX(order_index) as max_order FROM checklist_items WHERE template_id = ?', 
      [TEMPLATE_ID]
    );
    let orderIndex = (maxOrder?.max_order || 0) + 1;

    // 4) Insert new items
    console.log('   📝 Inserting new items...\n');
    let currentSection = '';
    
    for (let i = 0; i < ITEMS.length; i++) {
      const it = ITEMS[i];
      
      if (it.section !== currentSection) {
        currentSection = it.section;
        console.log(`   📁 ${currentSection}`);
      }
      
      await runDb(
        db,
        `INSERT INTO checklist_items (template_id, title, description, category, section, required, order_index, input_type, weight, is_critical)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          TEMPLATE_ID,
          it.title,
          it.description || '',
          CATEGORY,
          it.section,
          it.required !== undefined ? it.required : 1,
          orderIndex++,
          it.inputType,
          1,
          0
        ]
      );
      console.log(`      ✅ ${it.title}`);
    }

    console.log('\n🎉 Done! Speed of Service in Template 15 has been updated.\n');
    console.log('   Structure:');
    console.log('   ├── Trnx-1: 7 items (Table, Dish, 5 Time Attempts)');
    console.log('   ├── Trnx-2: 7 items');
    console.log('   ├── Trnx-3: 7 items');
    console.log('   ├── Trnx-4: 7 items');
    console.log('   └── Avg: 1 item (Average Auto-calculated)');
    console.log('\n   Total: 29 items');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    try {
      if (dbLoader.close) await dbLoader.close();
    } catch (e) {}
  }
}

main();
