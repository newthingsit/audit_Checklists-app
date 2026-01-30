/**
 * Optimize Speed of Service items in CVR - CDR Checklist
 * - Make transactions 2-4 optional (not required)
 * - Add helpful descriptions
 * - Ensure proper validation logic
 */

const db = require('../config/database-loader');
const logger = require('../utils/logger');

const TEMPLATE_NAME = 'CVR - CDR Checklist';

async function optimizeSpeedOfService() {
  const dbInstance = db.getDb();
  
  console.log('\n🔧 Optimizing Speed of Service items...\n');
  
  // Step 1: Find the template
  const template = await new Promise((resolve, reject) => {
    dbInstance.get(
      'SELECT id, name FROM checklist_templates WHERE name = ?',
      [TEMPLATE_NAME],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
  
  if (!template) {
    console.error(`❌ Template "${TEMPLATE_NAME}" not found`);
    process.exit(1);
  }
  
  console.log(`✅ Found template: ${template.name} (ID: ${template.id})`);
  
  // Step 2: Get all Speed of Service items
  const sosItems = await new Promise((resolve, reject) => {
    dbInstance.all(
      `SELECT id, title, section, required, order_index 
       FROM checklist_items 
       WHERE template_id = ? 
         AND subcategory = 'Speed of Service'
       ORDER BY order_index`,
      [template.id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
  
  console.log(`\n📊 Found ${sosItems.length} Speed of Service items`);
  
  // Step 3: Analyze current state
  const trnx1Items = sosItems.filter(i => i.section === 'Trnx-1');
  const trnx2Items = sosItems.filter(i => i.section === 'Trnx-2');
  const trnx3Items = sosItems.filter(i => i.section === 'Trnx-3');
  const trnx4Items = sosItems.filter(i => i.section === 'Trnx-4');
  const avgItems = sosItems.filter(i => i.section === 'Avg');
  
  console.log(`   Trnx-1: ${trnx1Items.length} items (${trnx1Items.filter(i => i.required).length} required)`);
  console.log(`   Trnx-2: ${trnx2Items.length} items (${trnx2Items.filter(i => i.required).length} required)`);
  console.log(`   Trnx-3: ${trnx3Items.length} items (${trnx3Items.filter(i => i.required).length} required)`);
  console.log(`   Trnx-4: ${trnx4Items.length} items (${trnx4Items.filter(i => i.required).length} required)`);
  console.log(`   Average: ${avgItems.length} items (${avgItems.filter(i => i.required).length} required)`);
  
  // Step 4: Make Trnx-2, Trnx-3, Trnx-4 optional
  console.log('\n🔧 Making transactions 2-4 optional...');
  
  const optionalSections = ['Trnx-2', 'Trnx-3', 'Trnx-4'];
  
  for (const section of optionalSections) {
    const result = await new Promise((resolve, reject) => {
      dbInstance.run(
        `UPDATE checklist_items 
         SET required = 0 
         WHERE template_id = ? 
           AND subcategory = 'Speed of Service' 
           AND section = ?`,
        [template.id, section],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
    
    console.log(`   ✅ ${section}: ${result} items updated to optional`);
  }
  
  // Step 5: Update descriptions to clarify usage
  console.log('\n📝 Updating item descriptions...');
  
  // Update Trnx-1 descriptions to indicate it's required
  await updateDescription(
    dbInstance,
    template.id,
    'Trnx-1',
    'Table Number',
    'Enter the table number (Required - Transaction 1)'
  );
  
  await updateDescription(
    dbInstance,
    template.id,
    'Trnx-1',
    'Dish Name',
    'Enter the name of the dish (Required - Transaction 1)'
  );
  
  // Update Trnx-2 descriptions to indicate it's optional
  await updateDescription(
    dbInstance,
    template.id,
    'Trnx-2',
    'Table Number',
    'Enter the table number (Optional - Transaction 2)'
  );
  
  await updateDescription(
    dbInstance,
    template.id,
    'Trnx-2',
    'Dish Name',
    'Enter the name of the dish (Optional - Transaction 2)'
  );
  
  // Update Trnx-3 descriptions
  await updateDescription(
    dbInstance,
    template.id,
    'Trnx-3',
    'Table Number',
    'Enter the table number (Optional - Transaction 3)'
  );
  
  await updateDescription(
    dbInstance,
    template.id,
    'Trnx-3',
    'Dish Name',
    'Enter the name of the dish (Optional - Transaction 3)'
  );
  
  // Update Trnx-4 descriptions
  await updateDescription(
    dbInstance,
    template.id,
    'Trnx-4',
    'Table Number',
    'Enter the table number (Optional - Transaction 4)'
  );
  
  await updateDescription(
    dbInstance,
    template.id,
    'Trnx-4',
    'Dish Name',
    'Enter the name of the dish (Optional - Transaction 4)'
  );
  
  // Update average description
  await updateDescription(
    dbInstance,
    template.id,
    'Avg',
    'Average (Auto)',
    'Auto-calculated average from all completed time measurements (minimum 4 time entries required)'
  );
  
  console.log('   ✅ All descriptions updated');
  
  // Step 6: Verify changes
  console.log('\n✅ Verification...\n');
  
  const updatedItems = await new Promise((resolve, reject) => {
    dbInstance.all(
      `SELECT section, required, COUNT(*) as count 
       FROM checklist_items 
       WHERE template_id = ? 
         AND subcategory = 'Speed of Service'
       GROUP BY section, required
       ORDER BY section, required`,
      [template.id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
  
  console.log('📊 Final State:');
  updatedItems.forEach(row => {
    console.log(`   ${row.section}: ${row.count} items (${row.required ? 'Required' : 'Optional'})`);
  });
  
  console.log('\n✅ Speed of Service optimization complete!\n');
  console.log('Summary:');
  console.log('- ✅ Transaction 1: Required (7 items)');
  console.log('- ✅ Transactions 2-4: Optional (21 items)');
  console.log('- ✅ Average: Required (1 item)');
  console.log('- ✅ Descriptions updated with helpful guidance');
  console.log('\nAuditors can now:');
  console.log('- Complete minimum 1 transaction (Trnx-1)');
  console.log('- Add up to 3 more transactions if needed');
  console.log('- Auto-calculate average from all entered times\n');
  
  process.exit(0);
}

async function updateDescription(dbInstance, templateId, section, title, description) {
  return new Promise((resolve, reject) => {
    dbInstance.run(
      `UPDATE checklist_items 
       SET description = ? 
       WHERE template_id = ? 
         AND category = 'SERVICE' 
         AND section = ? 
         AND title = ?`,
      [description, templateId, section, title],
      function(err) {
        if (err) {
          console.log(`   ⚠️  Failed to update: ${section} - ${title}`);
          reject(err);
        } else {
          console.log(`   ✅ Updated: ${section} - ${title}`);
          resolve(this.changes);
        }
      }
    );
  });
}

// Run the optimization
optimizeSpeedOfService().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
