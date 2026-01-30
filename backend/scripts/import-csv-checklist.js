#!/usr/bin/env node
/**
 * ============================================================================
 * COMPREHENSIVE CHECKLIST CSV IMPORT SCRIPT
 * ============================================================================
 * 
 * Purpose: Import checklist templates from CSV files with full flexibility
 * 
 * USAGE:
 * ------
 * Basic import:
 *   node scripts/import-csv-checklist.js --file checklist.csv --name "My Checklist"
 * 
 * With description and category:
 *   node scripts/import-csv-checklist.js \
 *     --file CVR_CDR_Checklist_checklist.csv \
 *     --name "CVR - CDR Checklist" \
 *     --description "Customer Visitor Review - Customer Delight Review" \
 *     --category "CDR"
 * 
 * Force overwrite existing template:
 *   node scripts/import-csv-checklist.js \
 *     --file checklist.csv \
 *     --name "My Checklist" \
 *     --overwrite
 * 
 * Environment variables (alternative to CLI args):
 *   CSV_FILE="path/to/file.csv"
 *   TEMPLATE_NAME="My Checklist"
 *   TEMPLATE_DESC="Description"
 *   TEMPLATE_CATEGORY="Category"
 *   OVERWRITE=1
 * 
 * ============================================================================
 * CSV FORMAT REQUIREMENTS
 * ============================================================================
 * 
 * Required columns:
 *   - title (or item_name): Item title/description
 * 
 * Optional columns:
 *   - description: Detailed description of the item
 *   - category: Main category (e.g., QUALITY, SERVICE, HYGIENE)
 *   - subcategory: Sub-category grouping
 *   - section: Section or subsection
 *   - input_type: Type of input (option_select, short_answer, number, etc.)
 *   - required: Is item required? (yes/no, true/false, 1/0)
 *   - weight: Item weight (1-3, affects scoring)
 *   - is_critical: Is item critical? (yes/no)
 *   - options: Answer options (e.g., "Yes:3|No:0|NA:NA")
 * 
 * Example CSV:
 * -----------
 * title,description,category,subcategory,input_type,required,weight,options
 * Food served at the right temperature,,QUALITY,Temperature,option_select,yes,1,Yes:3|No:0|NA:NA
 * Staff greeting,Greeting warmth and professionalism,SERVICE,Entrance,option_select,yes,2,Yes:3|No:0|NA:NA
 * 
 * ============================================================================
 * COLUMN MAPPING RULES
 * ============================================================================
 * 
 * The script automatically detects column names with flexible matching:
 * - title: "title", "item_name", "item", "description (if no title)"
 * - category: "category", "cat", "group"
 * - subcategory: "subcategory", "subcat", "sub_category"
 * - section: "section", "sec"
 * - input_type: "input_type", "type", "field_type", "input"
 * - required: "required", "req"
 * - weight: "weight", "priority"
 * - is_critical: "is_critical", "critical"
 * - options: "options", "choices", "answers"
 * 
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/database-loader');
const logger = require('../utils/logger');

// Parse command line arguments
const args = {};
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i].startsWith('--')) {
    const key = process.argv[i].substring(2);
    const value = process.argv[i + 1]?.startsWith('--') ? true : process.argv[i + 1];
    args[key] = value;
    if (!value?.startsWith('--')) i += 1;
  }
}

// Get parameters
const CSV_FILE = args.file || process.env.CSV_FILE;
const TEMPLATE_NAME = args.name || process.env.TEMPLATE_NAME;
const TEMPLATE_DESC = args.description || process.env.TEMPLATE_DESC || '';
const TEMPLATE_CATEGORY = args.category || process.env.TEMPLATE_CATEGORY || '';
const OVERWRITE = args.overwrite !== undefined ? true : process.env.OVERWRITE === '1';

// Validate inputs
if (!CSV_FILE || !TEMPLATE_NAME) {
  console.error('\n❌ Missing required parameters!\n');
  console.error('Usage: node scripts/import-csv-checklist.js --file <path> --name <name>\n');
  console.error('Optional: --description <desc> --category <cat> --overwrite\n');
  console.error('Environment variables: CSV_FILE, TEMPLATE_NAME, TEMPLATE_DESC, TEMPLATE_CATEGORY, OVERWRITE\n');
  process.exit(1);
}

const dbInstance = db.getDb();

// Database helpers
const runDb = (query, params = []) =>
  new Promise((resolve, reject) => {
    dbInstance.run(query, params, function (err, result) {
      if (err) return reject(err);
      const lastID = result?.lastID || this?.lastID;
      const changes = result?.changes || this?.changes;
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

// Parse CSV with proper quote/comma handling
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

// Convert string to boolean
const toBool = (value) => {
  const v = String(value || '').toLowerCase().trim();
  return v === 'yes' || v === 'true' || v === '1' || v === 'on';
};

// Convert string to number, return null if invalid
const toNumber = (value) => {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

// Find column index by multiple possible names
const findColumnIndex = (headers, possibleNames) => {
  const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[_\s]/g, ''));
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase().replace(/[_\s]/g, '');
    const idx = lowerHeaders.findIndex(h => h.includes(lowerName) || lowerName.includes(h));
    if (idx !== -1) return idx;
  }
  return -1;
};

async function importChecklist() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📥 IMPORTING CHECKLIST FROM CSV');
    console.log('='.repeat(70));
    
    // Validate file exists
    if (!fs.existsSync(CSV_FILE)) {
      throw new Error(`CSV file not found: ${CSV_FILE}`);
    }
    
    console.log(`\n📄 CSV File: ${CSV_FILE}`);
    console.log(`📋 Template Name: ${TEMPLATE_NAME}`);
    if (TEMPLATE_DESC) console.log(`📝 Description: ${TEMPLATE_DESC}`);
    if (TEMPLATE_CATEGORY) console.log(`🏷️  Category: ${TEMPLATE_CATEGORY}`);
    
    // Check if template exists
    const existing = await getDbRow(
      'SELECT id FROM checklist_templates WHERE name = ?',
      [TEMPLATE_NAME]
    );
    
    if (existing && !OVERWRITE) {
      throw new Error(`Template "${TEMPLATE_NAME}" already exists (ID: ${existing.id})\nUse --overwrite to replace it`);
    }
    
    if (existing && OVERWRITE) {
      console.log(`\n⚠️  Template already exists (ID: ${existing.id}), will delete and recreate...\n`);
      
      // Delete existing items first
      await runDb('DELETE FROM checklist_items WHERE template_id = ?', [existing.id]);
      
      // Delete template
      await runDb('DELETE FROM checklist_templates WHERE id = ?', [existing.id]);
      
      console.log('   ✅ Deleted existing template');
    }
    
    // Read and parse CSV
    console.log('\n🔍 Parsing CSV file...');
    const csvData = fs.readFileSync(CSV_FILE, 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header and one data row');
    }
    
    const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/"/g, ''));
    console.log(`   ✅ Found ${headers.length} columns: ${headers.join(', ')}`);
    
    // Map column indices
    const titleIdx = findColumnIndex(headers, ['title', 'item_name', 'item', 'description']);
    const descIdx = findColumnIndex(headers, ['description', 'desc', 'detail']);
    const catIdx = findColumnIndex(headers, ['category', 'cat', 'group']);
    const subIdx = findColumnIndex(headers, ['subcategory', 'subcat', 'sub_category']);
    const secIdx = findColumnIndex(headers, ['section', 'sec']);
    const typeIdx = findColumnIndex(headers, ['input_type', 'type', 'field_type', 'input']);
    const reqIdx = findColumnIndex(headers, ['required', 'req']);
    const weightIdx = findColumnIndex(headers, ['weight', 'priority']);
    const critIdx = findColumnIndex(headers, ['is_critical', 'critical', 'critical_flag']);
    const optIdx = findColumnIndex(headers, ['options', 'choices', 'answers']);
    
    if (titleIdx === -1) {
      throw new Error('CSV must have a "title" or "item_name" column');
    }
    
    console.log(`   ✅ Column mapping complete`);
    console.log(`      - Title: ${headers[titleIdx] || 'N/A'}`);
    if (descIdx !== -1) console.log(`      - Description: ${headers[descIdx]}`);
    if (catIdx !== -1) console.log(`      - Category: ${headers[catIdx]}`);
    if (typeIdx !== -1) console.log(`      - Input Type: ${headers[typeIdx]}`);
    if (reqIdx !== -1) console.log(`      - Required: ${headers[reqIdx]}`);
    if (optIdx !== -1) console.log(`      - Options: ${headers[optIdx]}`);
    
    // Create template
    console.log('\n📋 Creating template...');
    const templateResult = await runDb(
      `INSERT INTO checklist_templates (name, description, category) 
       VALUES (?, ?, ?)`,
      [TEMPLATE_NAME, TEMPLATE_DESC || TEMPLATE_NAME, TEMPLATE_CATEGORY || 'General']
    );
    const templateId = templateResult.lastID;
    
    console.log(`   ✅ Template created (ID: ${templateId})`);
    
    // Import items
    console.log('\n📥 Importing items...');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 1; i < lines.length; i += 1) {
      try {
        const values = parseCSVLine(lines[i]);
        
        // Skip empty rows
        if (!values[titleIdx]?.trim()) {
          skipCount += 1;
          continue;
        }
        
        const title = values[titleIdx]?.trim() || '';
        const description = descIdx !== -1 ? (values[descIdx]?.trim() || '') : '';
        const category = catIdx !== -1 ? (values[catIdx]?.trim() || '') : '';
        const subcategory = subIdx !== -1 ? (values[subIdx]?.trim() || '') : '';
        const section = secIdx !== -1 ? (values[secIdx]?.trim() || '') : '';
        const inputType = typeIdx !== -1 ? (values[typeIdx]?.trim() || 'option_select') : 'option_select';
        const required = reqIdx !== -1 ? toBool(values[reqIdx]) : true;
        const weight = weightIdx !== -1 ? (toNumber(values[weightIdx]) || 1) : 1;
        const isCritical = critIdx !== -1 ? toBool(values[critIdx]) : false;
        const options = optIdx !== -1 ? (values[optIdx]?.trim() || '') : '';
        
        const itemResult = await runDb(
          `INSERT INTO checklist_items 
           (template_id, title, description, category, subcategory, section, 
            input_type, required, weight, is_critical, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            templateId,
            title,
            description,
            category,
            subcategory,
            section,
            inputType,
            required ? 1 : 0,
            weight,
            isCritical ? 1 : 0,
            i
          ]
        );
        
        // If options provided, add them to checklist_item_options table
        if (options && itemResult.lastID) {
          const optionPairs = parseCSVLine(options.replace(/\|/g, ','));
          let optionIndex = 0;
          
          for (const optionPair of optionPairs) {
            const [optionText, mark] = optionPair.split(':').map(v => v.trim());
            if (optionText) {
              await runDb(
                `INSERT INTO checklist_item_options 
                 (item_id, option_text, mark, order_index)
                 VALUES (?, ?, ?, ?)`,
                [itemResult.lastID, optionText, mark || '0', optionIndex++]
              );
            }
          }
        }
        
        successCount += 1;
        
        if (successCount % 50 === 0) {
          process.stdout.write(`   ✓ ${successCount} items...`);
          process.stdout.write('\r');
        }
      } catch (err) {
        errorCount += 1;
        logger.warn(`Failed to import row ${i + 1}: ${err.message}`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ IMPORT COMPLETE');
    console.log('='.repeat(70));
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Successfully imported: ${successCount} items`);
    if (skipCount > 0) console.log(`   ⏭️  Skipped: ${skipCount} empty rows`);
    if (errorCount > 0) console.log(`   ❌ Errors: ${errorCount} rows`);
    console.log(`\n   Template ID: ${templateId}`);
    console.log(`   Total items: ${successCount}`);
    console.log(`\n📋 Template created: "${TEMPLATE_NAME}"`);
    
    // Verification
    const count = await getDbRow(
      'SELECT COUNT(*) as cnt FROM checklist_items WHERE template_id = ?',
      [templateId]
    );
    
    console.log(`\n✨ Verification: ${count.cnt} items in database`);
    console.log('\n' + '='.repeat(70));
    console.log('Ready to use! Template is now available in the audit app.\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n' + '='.repeat(70));
    process.exit(1);
  }
}

// Run the import
importChecklist();
