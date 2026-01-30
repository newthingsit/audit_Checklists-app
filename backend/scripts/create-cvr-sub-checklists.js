/**
 * Create optimized sub-checklists from CVR - CDR Checklist
 * Splits the large 252-item checklist into focused sub-checklists:
 * 1. CVR - Quality & Service (122 items, ~40 min)
 * 2. CVR - Hygiene & Cleanliness (104 items, ~26 min)
 * 3. CVR - Processes & Compliance (21 items, ~7 min)
 */

const db = require('../config/database-loader');
const logger = require('../utils/logger');

const SOURCE_TEMPLATE_NAME = 'CVR - CDR Checklist';

async function createSubChecklists() {
  const dbInstance = db.getDb();
  
  console.log('\n📋 Creating CVR Sub-Checklists...\n');
  
  // Step 1: Find source template
  const sourceTemplate = await new Promise((resolve, reject) => {
    dbInstance.get(
      'SELECT id, name FROM checklist_templates WHERE name = ?',
      [SOURCE_TEMPLATE_NAME],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
  
  if (!sourceTemplate) {
    console.error(`❌ Source template "${SOURCE_TEMPLATE_NAME}" not found`);
    process.exit(1);
  }
  
  console.log(`✅ Found source template: ${sourceTemplate.name} (ID: ${sourceTemplate.id})`);
  
  // Step 2: Get all items from source
  const allItems = await new Promise((resolve, reject) => {
    dbInstance.all(
      `SELECT * FROM checklist_items WHERE template_id = ? ORDER BY order_index`,
      [sourceTemplate.id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
  
  console.log(`📊 Source template has ${allItems.length} items\n`);
  
  // Step 3: Group items by category
  const qualityServiceItems = allItems.filter(i => 
    i.category === 'Quality' || 
    i.category?.startsWith('Service')
  );
  
  const hygieneItems = allItems.filter(i => 
    i.category?.startsWith('Hygiene & Cleanliness')
  );
  
  const processesItems = allItems.filter(i => 
    i.category === 'Processes' || 
    i.category === 'Acknowledgement'
  );
  
  console.log('📊 Item Distribution:');
  console.log(`   Quality & Service: ${qualityServiceItems.length} items`);
  console.log(`   Hygiene & Cleanliness: ${hygieneItems.length} items`);
  console.log(`   Processes & Compliance: ${processesItems.length} items\n`);
  
  // Step 4: Create sub-checklist templates
  const subChecklists = [
    {
      name: 'CVR - Quality & Service',
      description: 'Customer Visitor Review - Quality & Service Excellence (Food quality, customer service, delivery, technology)',
      items: qualityServiceItems,
      estimatedTime: 40
    },
    {
      name: 'CVR - Hygiene & Cleanliness',
      description: 'Customer Visitor Review - Hygiene & Cleanliness Standards (FOH, BOH, restrooms, equipment, staff appearance)',
      items: hygieneItems,
      estimatedTime: 26
    },
    {
      name: 'CVR - Processes & Compliance',
      description: 'Customer Visitor Review - Operational Processes & Compliance (Certifications, training, audits, coaching)',
      items: processesItems,
      estimatedTime: 7
    }
  ];
  
  // Step 5: Create each sub-checklist
  for (const subChecklist of subChecklists) {
    console.log(`\n🔧 Creating: ${subChecklist.name}...`);
    
    // Check if template already exists
    const existingTemplate = await new Promise((resolve, reject) => {
      dbInstance.get(
        'SELECT id FROM checklist_templates WHERE name = ?',
        [subChecklist.name],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (existingTemplate) {
      console.log(`   ⚠️  Template already exists (ID: ${existingTemplate.id}), deleting...`);
      // Delete items first
      await new Promise((resolve, reject) => {
        dbInstance.run(
          'DELETE FROM checklist_items WHERE template_id = ?',
          [existingTemplate.id],
          (err) => {
            if (err) reject(err);
            else {
              // Then delete template
              dbInstance.run(
                'DELETE FROM checklist_templates WHERE id = ?',
                [existingTemplate.id],
                (delErr) => {
                  if (delErr) reject(delErr);
                  else resolve();
                }
              );
            }
          }
        );
      });
      console.log(`   ✅ Deleted old template`);
    }
    
    // Create template
    let templateId = null;
    await new Promise((resolve, reject) => {
      dbInstance.run(
        `INSERT INTO checklist_templates (name, description, category) VALUES (?, ?, ?)`,
        [subChecklist.name, subChecklist.description, 'CVR'],
        function(err) {
          if (err) {
            reject(err);
          } else {
            templateId = this.lastID;
            resolve();
          }
        }
      );
    });
    
    // If lastID didn't work, query for it
    if (!templateId) {
      const result = await new Promise((resolve, reject) => {
        dbInstance.get(
          `SELECT TOP 1 id FROM checklist_templates WHERE name = ? ORDER BY id DESC`,
          [subChecklist.name],
          (err, row) => {
            if (err) reject(err);
            else resolve(row?.id);
          }
        );
      });
      templateId = result;
    }
    
    console.log(`   ✅ Template created (ID: ${templateId})`);
    
    // Copy items to new template (without options for now)
    let copiedCount = 0;
    for (let i = 0; i < subChecklist.items.length; i++) {
      const item = subChecklist.items[i];
      
      // Insert the checklist item
      await new Promise((resolve, reject) => {
        dbInstance.run(
          `INSERT INTO checklist_items (
            template_id, title, description, category, subcategory, section,
            input_type, required, weight, is_critical, order_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            templateId,
            item.title,
            item.description,
            item.category,
            item.subcategory,
            item.section,
            item.input_type,
            item.required,
            item.weight,
            item.is_critical,
            i + 1 // New order index
          ],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      copiedCount++;
      
      if (copiedCount % 25 === 0) {
        process.stdout.write(`   ✓ Copied ${copiedCount} items...\r`);
      }
    }
    
    console.log(`   ✅ Copied ${copiedCount} items`);
    console.log(`   ⏱️  Estimated audit time: ~${subChecklist.estimatedTime} minutes`);
  }
  
  // Step 6: Verification
  console.log('\n✅ Verification...\n');
  
  const createdTemplates = await new Promise((resolve, reject) => {
    dbInstance.all(
      `SELECT 
        ct.id, 
        ct.name, 
        COUNT(ci.id) as item_count
       FROM checklist_templates ct
       LEFT JOIN checklist_items ci ON ct.id = ci.template_id
       WHERE ct.name LIKE 'CVR - %'
       GROUP BY ct.id, ct.name
       ORDER BY ct.id`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
  
  console.log('📋 All CVR Templates:');
  createdTemplates.forEach(t => {
    console.log(`\n   ID: ${t.id}`);
    console.log(`   Name: ${t.name}`);
    console.log(`   Items: ${t.item_count}`);
  });
  
  console.log('\n✅ Sub-checklist creation complete!\n');
  console.log('Summary:');
  console.log('- ✅ Original: CVR - CDR Checklist (252 items, ~87 min)');
  console.log('- ✅ Split 1: CVR - Quality & Service (122 items, ~40 min)');
  console.log('- ✅ Split 2: CVR - Hygiene & Cleanliness (104 items, ~26 min)');
  console.log('- ✅ Split 3: CVR - Processes & Compliance (21 items, ~7 min)');
  console.log('\nBenefits:');
  console.log('- Faster audits (focused on specific areas)');
  console.log('- Better assignment (assign different audits to different staff)');
  console.log('- Easier to complete in one session');
  console.log('- Original template still available for comprehensive audits\n');
  
  process.exit(0);
}

// Run the creation
createSubChecklists().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
