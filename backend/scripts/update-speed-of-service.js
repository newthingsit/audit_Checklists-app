#!/usr/bin/env node
/**
 * Replace "SERVICE - Speed of Service" items in a given template with a curated list.
 *
 * Default template name: "CVR - CDR"
 *
 * Safe guards:
 * - Only deletes items in the specified template AND category.
 * - Uses database-loader for cross-DB compatibility.
 *
 * Usage:
 *   node backend/scripts/update-speed-of-service.js
 *   node backend/scripts/update-speed-of-service.js "Template Name"
 *   node backend/scripts/update-speed-of-service.js "Template Name" "Category Name"
 */

/* eslint-disable no-console */
require('dotenv').config();
const dbLoader = require('../config/database-loader');

const TEMPLATE_NAME = process.argv[2] || 'CVR - CDR';
const CATEGORY = process.argv[3] || 'SERVICE - Speed of Service';

// Curated items (ordered) - from user's screenshot
const ITEMS = [
  { title: 'If there was NO queue, were customers greeted within 10 seconds / acceptable time', yesMark: '3' },
  { title: 'If there was a queue, were customers greeted within 20 seconds / acceptable time', yesMark: '3' },
  { title: 'If there was a queue, were you quoted an accurate wait time and provided a menu?', yesMark: '3' },
  { title: 'Server offered to take the order within 2 minutes of your having been seated or buzzed', yesMark: '3' },
  { title: 'Was the complete food order served in a timely manner?', yesMark: '0', isHeader: true }, // This appears to be a sub-header
  { title: 'Straight Drinks on time (3-4 mins)', yesMark: '3', isSubItem: true },
  { title: 'Cocktails / Mocktails on time (5-8 mins)', yesMark: '3', isSubItem: true },
  { title: 'Starter on time (15-20 mins)', yesMark: '3', isSubItem: true },
  { title: 'Mains on time (15-20 mins)', yesMark: '3', isSubItem: true },
  { title: 'Desserts on time (10 mins)', yesMark: '3', isSubItem: true },
  { title: 'Station holder checked for the feedback within 3 mins of starters being served', yesMark: '3' },
  { title: 'Manager on duty checked for the feedback within 4 mins of main course being served', yesMark: '3' },
  { title: 'Dishes cleared within 7 minutes of guests finishing their meals or as required during the meal', yesMark: '3' },
  { title: 'Bill promptly presented within 4 mins of requesting', yesMark: '3' },
  { title: 'Staff took the payment at the table and returned with change or receipt within 5 minutes', yesMark: '3' },
  { title: 'Vacated tables cleared and cleaned within 4 minutes', yesMark: '2' }, // Score 2 for the last item per source
];

async function main() {
  console.log('🚀 Starting Speed of Service update script...');
  console.log(`📋 Template: "${TEMPLATE_NAME}"`);
  console.log(`📂 Category: "${CATEGORY}"`);
  
  try {
    // Initialize database connection
    await dbLoader.init?.();
    const db = dbLoader.getDb();
    
    // Find template
    console.log('\n🔍 Looking for template...');
    const template = await db.get('SELECT id, name FROM checklist_templates WHERE name = ?', [TEMPLATE_NAME]);
    
    if (!template) {
      console.error(`❌ Template not found: "${TEMPLATE_NAME}"`);
      console.log('\n📋 Available templates:');
      const allTemplates = await db.all('SELECT id, name FROM checklist_templates ORDER BY name');
      allTemplates.forEach(t => console.log(`   - ${t.name} (ID: ${t.id})`));
      process.exit(1);
    }
    
    console.log(`✅ Found template: "${template.name}" (ID: ${template.id})`);
    const templateId = template.id;
    
    // Check existing items in this category
    console.log(`\n🔍 Looking for existing items in category "${CATEGORY}"...`);
    const existing = await db.all(
      'SELECT id, title FROM checklist_items WHERE template_id = ? AND category = ?',
      [templateId, CATEGORY]
    );
    
    console.log(`📊 Found ${existing.length} existing items in this category`);
    
    if (existing.length > 0) {
      console.log('\n🧹 Removing existing items...');
      
      // Get all item IDs
      const existingIds = existing.map(r => r.id);
      
      // Delete options first (for each item individually to avoid complex IN clause)
      for (const itemId of existingIds) {
        await db.run('DELETE FROM checklist_item_options WHERE item_id = ?', [itemId]);
      }
      console.log(`   Deleted options for ${existingIds.length} items`);
      
      // Delete items
      for (const itemId of existingIds) {
        await db.run('DELETE FROM checklist_items WHERE id = ?', [itemId]);
      }
      console.log(`   Deleted ${existingIds.length} items`);
    }
    
    // Insert new items
    console.log(`\n📝 Inserting ${ITEMS.length} new items...`);
    
    for (let i = 0; i < ITEMS.length; i++) {
      const item = ITEMS[i];
      const displayTitle = item.isSubItem ? `- ${item.title}` : item.title;
      
      // Insert item
      const result = await db.run(
        `INSERT INTO checklist_items 
         (template_id, title, description, category, required, order_index, input_type, weight, is_critical)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          templateId,
          displayTitle,
          '',           // description
          CATEGORY,
          1,            // required
          i,            // order_index
          'option_select',
          1,            // weight
          0             // is_critical
        ]
      );
      
      const itemId = result.lastID;
      
      if (!itemId) {
        console.error(`   ❌ Failed to get lastID for item: ${displayTitle}`);
        continue;
      }
      
      // Insert options: Yes, No, N/A
      const options = [
        { option_text: 'Yes', mark: item.yesMark },
        { option_text: 'No', mark: '0' },
        { option_text: 'N/A', mark: 'NA' },
      ];
      
      for (let j = 0; j < options.length; j++) {
        const opt = options[j];
        await db.run(
          `INSERT INTO checklist_item_options (item_id, option_text, mark, order_index)
           VALUES (?, ?, ?, ?)`,
          [itemId, opt.option_text, opt.mark, j]
        );
      }
      
      console.log(`   ✅ [${i + 1}/${ITEMS.length}] ${displayTitle.substring(0, 60)}...`);
    }
    
    console.log(`\n🎉 SUCCESS! Inserted ${ITEMS.length} items into template "${TEMPLATE_NAME}" / category "${CATEGORY}"`);
    console.log('\n📊 Summary:');
    console.log(`   - Template: ${TEMPLATE_NAME}`);
    console.log(`   - Category: ${CATEGORY}`);
    console.log(`   - Items added: ${ITEMS.length}`);
    console.log(`   - Perfect Score: 44 points`);
    
  } catch (err) {
    console.error('\n❌ Error during update:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    try {
      await dbLoader.close?.();
      console.log('\n🔌 Database connection closed');
    } catch (e) {
      // Ignore close errors
    }
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
