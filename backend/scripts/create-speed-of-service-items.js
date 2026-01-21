#!/usr/bin/env node
/**
 * Create Speed of Service items with Time/Sec pairs organized in sections
 * Based on the screenshot requirements
 * 
 * Usage:
 *   node backend/scripts/create-speed-of-service-items.js "Template Name" "Category Name"
 */

require('dotenv').config();
const dbLoader = require('../config/database-loader');

const TEMPLATE_NAME = process.argv[2] || 'CVR - CDR';
const CATEGORY = process.argv[3] || 'SERVICE (Speed of Service)';

// Define items for each section based on screenshots
const TRACKING_ITEMS = [
  // Common items for Trnx-1, Trnx-2, Trnx-3, Trnx-4
  { title: 'Table no.', inputType: 'number', hasTime: false, hasSec: false },
  { title: 'Greeted (No Queue) (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Greeted (No Queue) (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Greeted (with Queue) (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Greeted (with Queue) (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Order taker approached (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Order taker approached (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Order taking time (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Order taking time (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Straight Drinks served (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Straight Drinks served (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Cocktails / Mocktails served (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Cocktails / Mocktails served (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Starters served (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Starters served (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Main Course served (no starters) (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Main Course served (no starters) (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Main Course served (after starters) (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Main Course served (after starters) (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Captain / F&B Exe. follow-up after starter (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Captain / F&B Exe. follow-up after starter (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Manager follow-up after mains (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Manager follow-up after mains (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Dishes cleared (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Dishes cleared (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Bill presented (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Bill presented (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Receipt & change given (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Receipt & change given (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Tables cleared, cleaned & set back (Time)', inputType: 'date', hasTime: true, hasSec: false },
  { title: 'Tables cleared, cleaned & set back (Sec)', inputType: 'number', hasTime: false, hasSec: true },
];

// Avg section items (slightly different)
const AVG_ITEMS = [
  { title: 'Table no.', inputType: 'number', hasTime: false, hasSec: false },
  { title: 'Greeted (with Queue) (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Greeted (No Queue) (Sec)', inputType: 'number', hasTime: false, hasSec: true },
  { title: 'Order taker approached (Sec)', inputType: 'number', hasTime: false, hasSec: true },
];

const SECTIONS = ['Trnx-1', 'Trnx-2', 'Trnx-3', 'Trnx-4', 'Avg'];

async function main() {
  console.log('🚀 Creating Speed of Service items...');
  console.log(`📋 Template: "${TEMPLATE_NAME}"`);
  console.log(`📂 Category: "${CATEGORY}"`);
  
  try {
    await dbLoader.init?.();
    const db = dbLoader.getDb();
    
    // Find template
    console.log('\n🔍 Looking for template...');
    const template = await new Promise((resolve, reject) => {
      db.get('SELECT id, name FROM checklist_templates WHERE name = ?', [TEMPLATE_NAME], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    
    if (!template) {
      console.error(`❌ Template not found: "${TEMPLATE_NAME}"`);
      process.exit(1);
    }
    
    console.log(`✅ Found template: "${template.name}" (ID: ${template.id})`);
    const templateId = template.id;
    
    // Delete existing items in this category
    console.log(`\n🧹 Removing existing items in category "${CATEGORY}"...`);
    const existing = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id FROM checklist_items 
         WHERE template_id = ? AND (category = ? OR (category LIKE ? AND section IN ('Trnx-1', 'Trnx-2', 'Trnx-3', 'Trnx-4', 'Avg')))`,
        [templateId, CATEGORY, `${CATEGORY}%`],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
    
    if (existing.length > 0) {
      const existingIds = existing.map(r => r.id);
      
      // Delete options first
      for (const itemId of existingIds) {
        await new Promise((resolve, reject) => {
          db.run('DELETE FROM checklist_item_options WHERE item_id = ?', [itemId], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }
      
      // Delete items
      for (const itemId of existingIds) {
        await new Promise((resolve, reject) => {
          db.run('DELETE FROM checklist_items WHERE id = ?', [itemId], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }
      
      console.log(`   ✅ Deleted ${existingIds.length} existing items`);
    }
    
    // Insert new items
    console.log(`\n📝 Inserting Speed of Service items...`);
    let totalInserted = 0;
    let orderIndex = 0;
    
    for (const section of SECTIONS) {
      const items = section === 'Avg' ? AVG_ITEMS : TRACKING_ITEMS;
      
      console.log(`\n   📦 Section: ${section} (${items.length} items)`);
      
      for (const item of items) {
        const result = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO checklist_items 
             (template_id, title, description, category, section, required, order_index, input_type, weight, is_critical)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              templateId,
              item.title,
              '',
              CATEGORY,
              section,
              1, // required
              orderIndex,
              item.inputType,
              1, // weight
              0  // is_critical
            ],
            function(err) {
              if (err) return reject(err);
              resolve({ lastID: this.lastID });
            }
          );
        });
        
        if (result.lastID) {
          totalInserted++;
          console.log(`      ✅ ${item.title}`);
        }
        
        orderIndex++;
      }
    }
    
    console.log(`\n🎉 SUCCESS! Inserted ${totalInserted} items`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Template: ${TEMPLATE_NAME}`);
    console.log(`   - Category: ${CATEGORY}`);
    console.log(`   - Sections: ${SECTIONS.join(', ')}`);
    console.log(`   - Total Items: ${totalInserted}`);
    console.log(`   - Items per Trnx section: ${TRACKING_ITEMS.length}`);
    console.log(`   - Items in Avg section: ${AVG_ITEMS.length}`);
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    try {
      await dbLoader.close?.();
    } catch (e) {
      // Ignore
    }
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
