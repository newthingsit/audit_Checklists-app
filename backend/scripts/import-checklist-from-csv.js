#!/usr/bin/env node
/**
 * Import checklist template from a CSV file.
 *
 * Usage:
 *   TEMPLATE_NAME="TEST - CVR 4" CSV_PATH="..\..\CVR_4_TEST_CDR_Plan.csv" node scripts/import-checklist-from-csv.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/database-loader');

const TEMPLATE_NAME = process.env.TEMPLATE_NAME || 'TEST - CVR 4';
const CSV_PATH = process.env.CSV_PATH || path.resolve(__dirname, '../../CVR_4_TEST_CDR_Plan.csv');
const CATEGORY = process.env.CATEGORY || 'CDR';
const DESCRIPTION = process.env.DESCRIPTION || 'Imported checklist for TEST - CVR 4';
const CREATED_BY = process.env.CREATED_BY ? parseInt(process.env.CREATED_BY, 10) : null;

const dbInstance = db.getDb();

const runDb = (query, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.run(query, params, function (err, result) {
      if (err) return reject(err);
      const lastID = result && result.lastID !== undefined ? result.lastID : this.lastID;
      const changes = result && result.changes !== undefined ? result.changes : this.changes;
      resolve({ lastID, changes });
    });
  });

const getDbRow = (query, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });

const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

const toBool = (value) => {
  const v = String(value || '').toLowerCase().trim();
  return v === 'yes' || v === 'true' || v === '1';
};

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV file not found: ${CSV_PATH}`);
  }

  const existing = await getDbRow('SELECT id FROM checklist_templates WHERE name = ?', [TEMPLATE_NAME]);
  if (existing?.id) {
    throw new Error(`Template "${TEMPLATE_NAME}" already exists (id=${existing.id})`);
  }

  const csvData = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const titleIdx = headers.findIndex(h => h === 'title' || h.includes('title') || h.includes('item'));
  const descIdx = headers.findIndex(h => h === 'description' || h.includes('desc'));
  const catIdx = headers.findIndex(h => h === 'category' || h.includes('cat'));
  const subIdx = headers.findIndex(h => h === 'subcategory' || h === 'subcat' || h === 'sub_category');
  const secIdx = headers.findIndex(h => h === 'section' || h === 'sec');
  const typeIdx = headers.findIndex(h => h === 'input_type' || h === 'type' || h === 'field_type');
  const reqIdx = headers.findIndex(h => h === 'required' || h === 'req');
  const weightIdx = headers.findIndex(h => h === 'weight');
  const critIdx = headers.findIndex(h => h === 'is_critical' || h === 'critical');
  const optIdx = headers.findIndex(h => h === 'options' || h === 'choices');

  if (titleIdx === -1) {
    throw new Error('CSV must have a "title" column');
  }

  const normalizeCategoryName = (value) => {
    if (!value) return '';
    let normalized = String(value).trim().replace(/\s+/g, ' ');
    normalized = normalized.replace(/\s*&\s*/g, ' & ');
    normalized = normalized.replace(/\s+and\s+/gi, ' & ');
    normalized = normalized.replace(/\bAcknowledgment\b/gi, 'Acknowledgement');
    return normalized;
  };

  const normalizeSectionName = (value) => {
    if (!value) return '';
    return String(value).trim().replace(/\s+/g, ' ');
  };

  const normalizeInputType = (rawType, title, applyPhotoFix) => {
    if (applyPhotoFix) {
      return 'image_upload';
    }
    const normalized = String(rawType || '').trim().toLowerCase();
    if (!normalized || normalized === 'auto') {
      if (applyPhotoFix && /photo/i.test(String(title || ''))) {
        return 'image_upload';
      }
      return normalized || 'auto';
    }
    const aliasToPhoto = ['image', 'photo', 'attachment', 'file'];
    if (applyPhotoFix && aliasToPhoto.includes(normalized)) {
      return 'image_upload';
    }
    return normalized;
  };

  const photoFixNames = (process.env.PHOTO_FIX_TEMPLATE_NAMES || '')
    .split(',')
    .map(n => n.trim().toLowerCase())
    .filter(Boolean);
  const applyPhotoFix = photoFixNames.includes(String(templateName || '').trim().toLowerCase());

  const items = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCSVLine(lines[i]);
    const title = values[titleIdx]?.replace(/^"|"$/g, '').trim();
    if (!title) continue;

    const options = [];
    if (optIdx !== -1 && values[optIdx]) {
      const optStr = values[optIdx].replace(/^"|"$/g, '').trim();
      if (optStr) {
        optStr.split('|').forEach((part, index) => {
          const [text, mark] = part.split(':');
          if (text && text.trim()) {
            options.push({
              option_text: text.trim(),
              mark: mark ? mark.trim() : '',
              order_index: index
            });
          }
        });
      }
    }

    items.push({
      title,
      description: descIdx !== -1 ? (values[descIdx]?.replace(/^"|"$/g, '').trim() || '') : '',
      category: catIdx !== -1 ? normalizeCategoryName(values[catIdx]?.replace(/^"|"$/g, '').trim() || '') : '',
      subcategory: subIdx !== -1 ? normalizeCategoryName(values[subIdx]?.replace(/^"|"$/g, '').trim() || '') : '',
      section: secIdx !== -1 ? normalizeSectionName(values[secIdx]?.replace(/^"|"$/g, '').trim() || '') : '',
        input_type: normalizeInputType(
          typeIdx !== -1 ? values[typeIdx]?.replace(/^"|"$/g, '').trim() || 'auto' : 'auto',
          title,
          applyPhotoFix
        ),
      required: reqIdx !== -1 ? toBool(values[reqIdx]) : true,
      weight: weightIdx !== -1 ? parseInt(values[weightIdx], 10) || 1 : 1,
      is_critical: critIdx !== -1 ? toBool(values[critIdx]) : false,
      options
    });
  }

  if (!items.length) {
    throw new Error('No items found in CSV');
  }

  const { lastID: templateId } = await runDb(
    'INSERT INTO checklist_templates (name, category, description, created_by) VALUES (?, ?, ?, ?)',
    [TEMPLATE_NAME, CATEGORY, DESCRIPTION, CREATED_BY]
  );

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const { lastID: itemId } = await runDb(
      `INSERT INTO checklist_items 
       (template_id, title, description, category, subcategory, section, required, order_index, input_type, weight, is_critical)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        templateId,
        item.title,
        item.description || '',
        item.category || '',
        item.subcategory || '',
        item.section || '',
        item.required ? 1 : 0,
        i,
        item.input_type,
        item.weight,
        item.is_critical ? 1 : 0
      ]
    );

    if (item.options.length > 0) {
      for (const opt of item.options) {
        await runDb(
          'INSERT INTO checklist_item_options (item_id, option_text, mark, order_index) VALUES (?, ?, ?, ?)',
          [itemId, opt.option_text, opt.mark, opt.order_index]
        );
      }
    }
  }

  console.log(`Imported template "${TEMPLATE_NAME}" with ${items.length} items.`);
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
