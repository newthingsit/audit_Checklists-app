#!/usr/bin/env node
/**
 * Replace "Speed of Service" items in a given template with a curated list.
 *
 * Default template name: "CVR - CDR"
 *
 * Safe guards:
 * - Only deletes items in the specified template AND category = "Speed of Service".
 * - Runs in a transaction.
 *
 * Usage:
 *   node backend/scripts/update-speed-of-service.js
 *   node backend/scripts/update-speed-of-service.js "Template Name"
 *
 * This script respects DB_TYPE / env settings via database-loader, so it will
 * work for SQLite, MSSQL, Postgres, or MySQL as configured.
 */

/* eslint-disable no-console */
require('dotenv').config();
const dbLoader = require('../config/database-loader');

const TEMPLATE_NAME = process.argv[2] || 'CVR - CDR';
const CATEGORY = 'Speed of Service';

// Curated items (ordered)
const ITEMS = [
  { title: 'If there was NO queue, were customers greeted within 10 seconds / acceptable time', yesMark: '3' },
  { title: 'If there was a queue, were customers greeted within 20 seconds / acceptable time', yesMark: '3' },
  { title: 'If there was a queue, were you quoted an accurate wait time and provided a menu?', yesMark: '3' },
  { title: 'Server offered to take the order within 2 minutes of your having been seated or buzzed', yesMark: '3' },
  { title: 'Was the complete food order served in a timely manner?', yesMark: '3' },
  { title: 'Straight Drinks on time (3-4 mins)', yesMark: '3' },
  { title: 'Cocktails / Mocktails on time (5-8 mins)', yesMark: '3' },
  { title: 'Starter on time (15-20 mins)', yesMark: '3' },
  { title: 'Mains on time (15-20 mins)', yesMark: '3' },
  { title: 'Desserts on time (10 mins)', yesMark: '3' },
  { title: 'Station holder checked for the feedback within 3 mins of starters being served', yesMark: '3' },
  { title: 'Manager on duty checked for the feedback within 4 mins of main course being served', yesMark: '3' },
  { title: 'Dishes cleared within 7 minutes of guests finishing their meals or as required during the meal', yesMark: '3' },
  { title: 'Bill promptly presented within 4 mins of requesting', yesMark: '3' },
  { title: 'Staff took the payment at the table and returned with change or receipt within 5 minutes', yesMark: '3' },
  { title: 'Vacated tables cleared and cleaned within 4 minutes', yesMark: '2' }, // Score 2 for the last item per source
];

// Helpers for promisified DB calls (works for sqlite/mssql/mysql/pg implementations used by the app)
const run = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });

const all = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

const get = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });

async function main() {
  await dbLoader.init?.();
  const db = dbLoader.getDb();

  console.log(`➡️  Updating category "${CATEGORY}" in template "${TEMPLATE_NAME}"`);

  // Find template
  const template = await get(db, 'SELECT id FROM checklist_templates WHERE name = ?', [TEMPLATE_NAME]);
  if (!template) {
    console.error(`❌ Template not found: ${TEMPLATE_NAME}`);
    process.exit(1);
  }

  // Begin transaction
  await run(db, 'BEGIN');
  try {
    const templateId = template.id;

    // Fetch existing items in this category
    const existing = await all(
      db,
      'SELECT id FROM checklist_items WHERE template_id = ? AND category = ?',
      [templateId, CATEGORY]
    );
    const existingIds = existing.map((r) => r.id);

    if (existingIds.length > 0) {
      // Delete options first
      const placeholders = existingIds.map(() => '?').join(',');
      await run(db, `DELETE FROM checklist_item_options WHERE item_id IN (${placeholders})`, existingIds);
      await run(db, `DELETE FROM checklist_items WHERE id IN (${placeholders})`, existingIds);
      console.log(`🧹 Removed ${existingIds.length} existing items in category "${CATEGORY}"`);
    } else {
      console.log(`ℹ️  No existing items found in category "${CATEGORY}"`);
    }

    // Insert curated items with options (Yes/No/NA)
    for (let i = 0; i < ITEMS.length; i++) {
      const item = ITEMS[i];
      const res = await run(
        db,
        `INSERT INTO checklist_items 
         (template_id, title, description, category, required, order_index, input_type, weight, is_critical)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          templateId,
          item.title,
          item.description || '',
          CATEGORY,
          1, // required
          i,
          'option_select',
          1,
          0
        ]
      );
      const itemId = res.lastID;

      const options = [
        { option_text: 'Yes', mark: item.yesMark },
        { option_text: 'No', mark: '0' },
        { option_text: 'N/A', mark: 'NA' },
      ];

      for (let j = 0; j < options.length; j++) {
        const opt = options[j];
        await run(
          db,
          `INSERT INTO checklist_item_options (item_id, option_text, mark, order_index)
           VALUES (?, ?, ?, ?)`,
          [itemId, opt.option_text, opt.mark, j]
        );
      }
    }

    await run(db, 'COMMIT');
    console.log(`✅ Inserted ${ITEMS.length} items into template "${TEMPLATE_NAME}" / category "${CATEGORY}"`);
  } catch (err) {
    console.error('❌ Error during update, rolling back:', err.message);
    await run(db, 'ROLLBACK');
    process.exit(1);
  } finally {
    await dbLoader.close?.();
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
