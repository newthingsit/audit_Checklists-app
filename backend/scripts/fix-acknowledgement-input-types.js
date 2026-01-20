#!/usr/bin/env node
/**
 * Fix legacy ACKNOWLEDGEMENT items that were imported without input_type.
 *
 * Targets items with titles containing:
 *  - "Manager on Duty"  -> input_type = 'short_answer'
 *  - "Signature"        -> input_type = 'signature'
 *
 * Also deletes any options attached to those items.
 *
 * Defaults to DRY RUN. Set APPLY=1 to write changes.
 * Optional: TEMPLATE_NAME="CVR 3 – (CDR) Plan" to scope by template name.
 */

const db = require('../config/database-loader');

const APPLY = process.env.APPLY === '1';
const TEMPLATE_NAME = process.env.TEMPLATE_NAME;

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

const normalize = (value) => (value || '').toLowerCase();

const getTargetType = (title) => {
  const t = normalize(title);
  if (t.includes('signature')) return 'signature';
  if (t.includes('manager on duty')) return 'short_answer';
  return null;
};

async function main() {
  console.log(`\n=== Fix ACKNOWLEDGEMENT input types (APPLY=${APPLY ? 'yes' : 'dry-run'}) ===`);
  if (TEMPLATE_NAME) {
    console.log(`Scope: template name = "${TEMPLATE_NAME}"`);
  }

  const whereClauses = [
    `LOWER(ci.title) LIKE ?`,
    `LOWER(ci.title) LIKE ?`
  ];
  const params = ['%manager on duty%', '%signature%'];

  if (TEMPLATE_NAME) {
    whereClauses.push(`ct.name = ?`);
    params.push(TEMPLATE_NAME);
  }

  const items = await queryAll(
    `SELECT ci.id, ci.title, ci.input_type, ci.template_id, ct.name AS template_name
     FROM checklist_items ci
     JOIN checklist_templates ct ON ct.id = ci.template_id
     WHERE ${whereClauses.join(' OR ')}`,
    params
  );

  if (!items.length) {
    console.log('No matching items found.');
    process.exit(0);
  }

  let updated = 0;
  let optionsDeleted = 0;

  for (const item of items) {
    const targetType = getTargetType(item.title);
    if (!targetType) continue;

    const currentType = normalize(item.input_type || 'auto');
    const willChangeType = currentType !== targetType;

    const opts = await queryGet(
      `SELECT COUNT(1) AS count FROM checklist_item_options WHERE item_id = ?`,
      [item.id]
    );
    const hasOptions = (opts?.count || 0) > 0;

    if (willChangeType || hasOptions) {
      console.log(
        `Item ${item.id} "${item.title}" [${item.template_name}] :: ` +
        `input_type ${item.input_type || 'auto'} -> ${targetType} ` +
        `| options: ${hasOptions ? 'delete' : 'none'}`
      );
    }

    if (APPLY) {
      if (willChangeType) {
        await run(`UPDATE checklist_items SET input_type = ? WHERE id = ?`, [targetType, item.id]);
        updated += 1;
      }
      if (hasOptions) {
        const res = await run(`DELETE FROM checklist_item_options WHERE item_id = ?`, [item.id]);
        optionsDeleted += res.changes || 0;
      }
    }
  }

  console.log(
    `\nSummary: ${items.length} matched | ` +
    `${updated} input_type updated | ${optionsDeleted} options deleted ` +
    `${APPLY ? '(written)' : '(dry-run only)'}`
  );

  process.exit(0);
}

main().catch((err) => {
  console.error('Fix failed:', err.message);
  process.exit(1);
});
