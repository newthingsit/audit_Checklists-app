#!/usr/bin/env node
/**
 * Create a professional Speed of Service (SOS) checklist matching CVR-CDR structure:
 * 
 * STRUCTURE:
 * ├── Trnx-1 (Transaction 1)
 * │   ├── Table Number
 * │   ├── Dish Name  
 * │   ├── Time – Attempt 1
 * │   ├── Time – Attempt 2
 * │   ├── Time – Attempt 3
 * │   ├── Time – Attempt 4
 * │   └── Time – Attempt 5
 * │
 * ├── Trnx-2 (Transaction 2) - Same items
 * ├── Trnx-3 (Transaction 3) - Same items
 * ├── Trnx-4 (Transaction 4) - Same items
 * │
 * └── Avg (Averages - Auto-calculated)
 *     └── Average (Auto)
 *
 * Usage:
 *   node backend/scripts/create-simple-sos-checklist.js
 *   node backend/scripts/create-simple-sos-checklist.js "My Template Name"
 *   node backend/scripts/create-simple-sos-checklist.js "My Template Name" 38   # specific template ID
 */

require('dotenv').config();
const dbLoader = require('../config/database-loader');

const TEMPLATE_NAME = process.argv[2] || 'Speed of Service';
const TEMPLATE_ID = process.argv[3] ? parseInt(process.argv[3], 10) : null;
const CATEGORY = 'Speed of Service';

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

// Professional SOS Checklist with Trnx-1 to Trnx-4 + Avg sections
const ITEMS = [
  // ─────────────────────────────────────────────────────────────
  // SECTION: Trnx-1 (Transaction 1)
  // ─────────────────────────────────────────────────────────────
  ...generateTransactionItems('Trnx-1'),

  // ─────────────────────────────────────────────────────────────
  // SECTION: Trnx-2 (Transaction 2)
  // ─────────────────────────────────────────────────────────────
  ...generateTransactionItems('Trnx-2'),

  // ─────────────────────────────────────────────────────────────
  // SECTION: Trnx-3 (Transaction 3)
  // ─────────────────────────────────────────────────────────────
  ...generateTransactionItems('Trnx-3'),

  // ─────────────────────────────────────────────────────────────
  // SECTION: Trnx-4 (Transaction 4)
  // ─────────────────────────────────────────────────────────────
  ...generateTransactionItems('Trnx-4'),

  // ─────────────────────────────────────────────────────────────
  // SECTION: Avg (Averages)
  // ─────────────────────────────────────────────────────────────
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
      // MSSQL passes { lastID, changes } as second arg; SQLite uses this.lastID
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

async function main() {
  console.log('🔟 Creating Simple Speed of Service (SOS) checklist...');
  console.log(`   Template: "${TEMPLATE_NAME}"${TEMPLATE_ID ? ` (ID: ${TEMPLATE_ID})` : ''}`);
  console.log(`   Category: "${CATEGORY}"`);
  console.log(`   Items: ${ITEMS.length}\n`);

  try {
    if (dbLoader.init) await dbLoader.init();
    const db = dbLoader.getDb();

    // 1) Find or create template
    let template;
    
    // If a specific template ID is provided, use that
    if (TEMPLATE_ID) {
      template = await getDb(db, 'SELECT id, name FROM checklist_templates WHERE id = ?', [TEMPLATE_ID]);
      if (!template) {
        console.error(`   Template with ID ${TEMPLATE_ID} not found.`);
        process.exit(1);
      }
      console.log(`   ✅ Using template by ID: "${template.name}" (ID: ${template.id})\n`);
    } else {
      template = await getDb(db, 'SELECT id, name FROM checklist_templates WHERE name = ?', [TEMPLATE_NAME]);

      if (!template) {
        console.log(`   Template "${TEMPLATE_NAME}" not found. Creating...`);
        await runDb(db, 'INSERT INTO checklist_templates (name, category, description, created_by) VALUES (?, ?, ?, ?)', [
          TEMPLATE_NAME,
          CATEGORY,
          'SOS: enter table number, name of dish, 5 times (minutes), average auto-calculated.',
          null
        ]);
        template = await getDb(db, 'SELECT id, name FROM checklist_templates WHERE name = ?', [TEMPLATE_NAME]);
        if (!template) {
          console.error('   Failed to create template.');
          process.exit(1);
        }
        console.log(`   ✅ Created template: "${template.name}" (ID: ${template.id})\n`);
      } else {
        console.log(`   ✅ Using existing template: "${template.name}" (ID: ${template.id})\n`);
      }
    }

    const templateId = template.id;

    // 2) Remove existing items in this category (so we can re-run to refresh)
    const existing = await new Promise((resolve, reject) => {
      db.all('SELECT id FROM checklist_items WHERE template_id = ? AND (category = ? OR category IS NULL)', [templateId, CATEGORY], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    if (existing.length > 0) {
      for (const r of existing) {
        await runDb(db, 'DELETE FROM checklist_item_options WHERE item_id = ?', [r.id]);
        await runDb(db, 'DELETE FROM checklist_items WHERE id = ?', [r.id]);
      }
      console.log(`   🧹 Removed ${existing.length} existing "${CATEGORY}" item(s).\n`);
    }

    // 3) Insert items with sections
    console.log('   📝 Inserting items...\n');
    let currentSection = '';
    for (let i = 0; i < ITEMS.length; i++) {
      const it = ITEMS[i];
      
      // Log section header when section changes
      if (it.section && it.section !== currentSection) {
        currentSection = it.section;
        console.log(`   📁 ${currentSection}`);
      }
      
      const { lastID: itemId } = await runDb(
        db,
        `INSERT INTO checklist_items (template_id, title, description, category, section, required, order_index, input_type, weight, is_critical)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          templateId,
          it.title,
          it.description || '',
          CATEGORY,
          it.section || null,  // Include section
          it.required !== undefined ? it.required : 1,
          i,
          it.inputType,
          1,
          0
        ]
      );
      if (it.options && it.options.length) {
        for (let j = 0; j < it.options.length; j++) {
          const o = it.options[j];
          await runDb(db, 'INSERT INTO checklist_item_options (item_id, option_text, mark, order_index) VALUES (?, ?, ?, ?)', [
            itemId,
            o.option_text,
            o.mark !== undefined ? String(o.mark) : '',
            o.order_index !== undefined ? o.order_index : j
          ]);
        }
      }
      console.log(`      ✅ ${it.title}`);
    }

    console.log('\n🎉 Done. Simple SOS checklist is ready.\n');
    console.log('   In the app: start an audit with template "' + TEMPLATE_NAME + '" and use category "' + CATEGORY + '".');
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
