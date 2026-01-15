#!/usr/bin/env node
/**
 * Migrate checklist item input types based on naming convention.
 * Also supports optional template cloning.
 *
 * Defaults to DRY RUN. Set APPLY=1 to actually write changes.
 *
 * Mapping rules (case-insensitive):
 *  - Title contains "(Sec)"  -> input_type = 'number'
 *  - Title contains "(Time)" -> input_type = 'date'
 *  - Otherwise (no options)  -> input_type = 'open_ended'
 *  - Items with options are left as option_select
 *
 * Required rule (optional):
 *  - If title contains "(Sec)" or "(Time)", mark required = 1
 *
 * Optional cloning:
 *  - Set CLONE_TEMPLATE_NAME (existing template name)
 *  - Set NEW_TEMPLATE_NAME   (new template name)
 *  - Set APPLY=1 and APPLY_CLONE=1 to create the clone
 *
 * Usage:
 *   APPLY=1 node scripts/migrate-input-types.js
 *   APPLY=1 APPLY_CLONE=1 CLONE_TEMPLATE_NAME="CVR 1 – (CDR) Plan" NEW_TEMPLATE_NAME="CVR 1 – (CDR) Plan (Mapped)" node scripts/migrate-input-types.js
 */

const db = require('../config/database-loader');

const APPLY = process.env.APPLY === '1';
const APPLY_CLONE = process.env.APPLY_CLONE === '1';
const CLONE_TEMPLATE_NAME = process.env.CLONE_TEMPLATE_NAME;
const NEW_TEMPLATE_NAME = process.env.NEW_TEMPLATE_NAME;

const dbInstance = db.getDb();

const queryAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

const queryGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });

const mapInputType = (item) => {
  // Preserve explicit input_type
  const current = (item.input_type || '').toLowerCase();
  if (current && current !== 'auto') return current;

  const title = (item.title || '').toLowerCase();
  if (title.includes('(sec)')) return 'number';
  if (title.includes('(time)')) return 'date';

  // If the item has options, keep option_select
  if (item.hasOptions) return 'option_select';

  return 'open_ended';
};

const shouldRequire = (item) => {
  const title = (item.title || '').toLowerCase();
  return title.includes('(sec)') || title.includes('(time)');
};

async function migrateExistingItems() {
  console.log(`\n=== Migrating input types (APPLY=${APPLY ? 'yes' : 'dry-run'}) ===`);

  const items = await queryAll(
    `SELECT ci.id, ci.title, ci.input_type, ci.required, ci.order_index,
            EXISTS(SELECT 1 FROM checklist_item_options o WHERE o.item_id = ci.id) AS hasOptions
     FROM checklist_items ci`
  );

  let touched = 0;

  for (const item of items) {
    const newType = mapInputType(item);
    const makeRequired = shouldRequire(item);
    const required = makeRequired ? 1 : item.required;

    const typeChanged = newType !== (item.input_type || '');
    const reqChanged = required !== item.required;

    if (typeChanged || reqChanged) {
      touched += 1;
      console.log(
        `Item ${item.id} "${item.title}" :: ${item.input_type || 'auto'} -> ${newType} | required: ${item.required} -> ${required}`
      );
      if (APPLY) {
        await run(`UPDATE checklist_items SET input_type = ?, required = ? WHERE id = ?`, [
          newType,
          required,
          item.id
        ]);
      }
    }
  }

  console.log(`\nItems touched: ${touched} ${APPLY ? '(written)' : '(dry-run only)'}`);
}

async function cloneTemplateIfRequested() {
  if (!APPLY_CLONE) {
    console.log('\nClone step skipped (APPLY_CLONE != 1).');
    return;
  }
  if (!CLONE_TEMPLATE_NAME || !NEW_TEMPLATE_NAME) {
    console.log('\nClone step skipped (CLONE_TEMPLATE_NAME / NEW_TEMPLATE_NAME missing).');
    return;
  }

  console.log(
    `\n=== Cloning template "${CLONE_TEMPLATE_NAME}" -> "${NEW_TEMPLATE_NAME}" (APPLY=${APPLY ? 'yes' : 'dry-run'}) ===`
  );

  const srcTemplate = await queryGet(`SELECT * FROM checklist_templates WHERE name = ?`, [
    CLONE_TEMPLATE_NAME
  ]);
  if (!srcTemplate) {
    console.log(`Source template not found: ${CLONE_TEMPLATE_NAME}`);
    return;
  }

  if (!APPLY) {
    console.log('Dry-run: would create new template and copy items/options with mapped input types.');
    return;
  }

  // Insert new template (copy core columns we know exist)
  const newTemplateRes = await run(
    `INSERT INTO checklist_templates (name, category, description, created_by)
     VALUES (?, ?, ?, ?)`,
    [NEW_TEMPLATE_NAME, srcTemplate.category || '', srcTemplate.description || '', srcTemplate.created_by || null]
  );
  const newTemplateId = newTemplateRes.lastID;
  console.log(`Created new template id=${newTemplateId}`);

  const srcItems = await queryAll(
    `SELECT * FROM checklist_items WHERE template_id = ? ORDER BY order_index, id`,
    [srcTemplate.id]
  );

  for (const srcItem of srcItems) {
    const hasOptions = await queryGet(
      `SELECT 1 as hasOpt FROM checklist_item_options WHERE item_id = ? LIMIT 1`,
      [srcItem.id]
    );
    const newType = mapInputType({ ...srcItem, hasOptions: !!hasOptions });
    const makeRequired = shouldRequire(srcItem);
    const required = makeRequired ? 1 : srcItem.required;

    const itemRes = await run(
      `INSERT INTO checklist_items 
       (template_id, title, description, category, required, order_index, input_type, weight, is_critical, is_time_based, target_time_minutes, min_time_minutes, max_time_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newTemplateId,
        srcItem.title,
        srcItem.description || '',
        srcItem.category || '',
        required,
        srcItem.order_index || 0,
        newType,
        srcItem.weight || 1,
        srcItem.is_critical || 0,
        srcItem.is_time_based || 0,
        srcItem.target_time_minutes || null,
        srcItem.min_time_minutes || null,
        srcItem.max_time_minutes || null
      ]
    );
    const newItemId = itemRes.lastID;

    const opts = await queryAll(
      `SELECT * FROM checklist_item_options WHERE item_id = ? ORDER BY order_index, id`,
      [srcItem.id]
    );
    for (const opt of opts) {
      await run(
        `INSERT INTO checklist_item_options (item_id, option_text, mark, order_index)
         VALUES (?, ?, ?, ?)`,
        [newItemId, opt.option_text, opt.mark, opt.order_index || 0]
      );
    }
  }

  console.log(`Cloned ${srcItems.length} items (with options) to template "${NEW_TEMPLATE_NAME}"`);
}

async function main() {
  try {
    await migrateExistingItems();
    await cloneTemplateIfRequested();
    console.log('\nDone.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

main();
