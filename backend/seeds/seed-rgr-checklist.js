/**
 * Seed script for RGR Checklist
 * 
 * RGR (Restaurant General Review) - Simple photo-based audit checklist
 * Auditors can select store, take photos, and save the audit.
 * 
 * Run with: node seeds/seed-rgr-checklist.js
 */

const db = require('../config/database-loader');

const RGR_CHECKLIST = {
  name: 'RGR - Restaurant General Review',
  category: 'General',
  description: 'Quick photo-based general restaurant review. Select store, take photos for each area, and save.',
  items: [
    {
      title: 'Front Entrance',
      description: 'Take photo of the front entrance area - check cleanliness and signage',
      category: 'Exterior',
      required: true,
      order_index: 0,
      options: [
        { option_text: 'Good', mark: '3', order_index: 0 },
        { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
        { option_text: 'Poor', mark: '0', order_index: 2 },
        { option_text: 'N/A', mark: 'NA', order_index: 3 }
      ]
    },
    {
      title: 'Dining Area',
      description: 'Take photo of the dining area - check tables, chairs, floor cleanliness',
      category: 'Interior',
      required: true,
      order_index: 1,
      options: [
        { option_text: 'Good', mark: '3', order_index: 0 },
        { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
        { option_text: 'Poor', mark: '0', order_index: 2 },
        { option_text: 'N/A', mark: 'NA', order_index: 3 }
      ]
    },
    {
      title: 'Counter/Service Area',
      description: 'Take photo of the counter/service area - check organization and cleanliness',
      category: 'Interior',
      required: true,
      order_index: 2,
      options: [
        { option_text: 'Good', mark: '3', order_index: 0 },
        { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
        { option_text: 'Poor', mark: '0', order_index: 2 },
        { option_text: 'N/A', mark: 'NA', order_index: 3 }
      ]
    },
    {
      title: 'Kitchen Area',
      description: 'Take photo of the kitchen - check equipment, cleanliness, organization',
      category: 'Kitchen',
      required: true,
      order_index: 3,
      options: [
        { option_text: 'Good', mark: '3', order_index: 0 },
        { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
        { option_text: 'Poor', mark: '0', order_index: 2 },
        { option_text: 'N/A', mark: 'NA', order_index: 3 }
      ]
    },
    {
      title: 'Storage Area',
      description: 'Take photo of storage area - check proper storage, labeling, organization',
      category: 'Kitchen',
      required: true,
      order_index: 4,
      options: [
        { option_text: 'Good', mark: '3', order_index: 0 },
        { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
        { option_text: 'Poor', mark: '0', order_index: 2 },
        { option_text: 'N/A', mark: 'NA', order_index: 3 }
      ]
    },
    {
      title: 'Restroom',
      description: 'Take photo of restroom - check cleanliness and supplies',
      category: 'Facilities',
      required: true,
      order_index: 5,
      options: [
        { option_text: 'Good', mark: '3', order_index: 0 },
        { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
        { option_text: 'Poor', mark: '0', order_index: 2 },
        { option_text: 'N/A', mark: 'NA', order_index: 3 }
      ]
    },
    {
      title: 'Staff Appearance',
      description: 'Take photo of staff - check uniforms, name tags, hygiene',
      category: 'Staff',
      required: false,
      order_index: 6,
      options: [
        { option_text: 'Good', mark: '3', order_index: 0 },
        { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
        { option_text: 'Poor', mark: '0', order_index: 2 },
        { option_text: 'N/A', mark: 'NA', order_index: 3 }
      ]
    },
    {
      title: 'Menu Display',
      description: 'Take photo of menu display - check visibility, pricing, condition',
      category: 'Interior',
      required: false,
      order_index: 7,
      options: [
        { option_text: 'Good', mark: '3', order_index: 0 },
        { option_text: 'Needs Improvement', mark: '1', order_index: 1 },
        { option_text: 'Poor', mark: '0', order_index: 2 },
        { option_text: 'N/A', mark: 'NA', order_index: 3 }
      ]
    }
  ]
};

async function seedRGRChecklist() {
  console.log('🔄 Initializing database...');
  
  try {
    await db.init();
    const dbInstance = db.getDb();
    
    // Check if RGR checklist already exists
    const existingResult = await new Promise((resolve, reject) => {
      dbInstance.get(
        "SELECT id FROM checklist_templates WHERE name LIKE '%RGR%'",
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (existingResult) {
      console.log('⚠️  RGR checklist already exists with ID:', existingResult.id);
      console.log('   Skipping creation. Delete existing checklist first if you want to recreate.');
      process.exit(0);
    }
    
    console.log('📝 Creating RGR checklist template...');
    
    // Create template
    const templateResult = await new Promise((resolve, reject) => {
      dbInstance.run(
        'INSERT INTO checklist_templates (name, category, description, created_by) VALUES (?, ?, ?, ?)',
        [RGR_CHECKLIST.name, RGR_CHECKLIST.category, RGR_CHECKLIST.description, 1],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        }
      );
    });
    
    const templateId = templateResult.lastID;
    console.log('✅ Created template with ID:', templateId);
    
    // Create items
    for (const item of RGR_CHECKLIST.items) {
      console.log(`   Adding item: ${item.title}`);
      
      const itemResult = await new Promise((resolve, reject) => {
        dbInstance.run(
          'INSERT INTO checklist_items (template_id, title, description, category, required, order_index) VALUES (?, ?, ?, ?, ?, ?)',
          [templateId, item.title, item.description, item.category, item.required ? 1 : 0, item.order_index],
          function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID });
          }
        );
      });
      
      const itemId = itemResult.lastID;
      
      // Create options for this item
      for (const option of item.options) {
        await new Promise((resolve, reject) => {
          dbInstance.run(
            'INSERT INTO checklist_item_options (item_id, option_text, mark, order_index) VALUES (?, ?, ?, ?)',
            [itemId, option.option_text, option.mark, option.order_index],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }
    
    console.log('');
    console.log('✅ RGR Checklist created successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   Template ID: ${templateId}`);
    console.log(`   Name: ${RGR_CHECKLIST.name}`);
    console.log(`   Items: ${RGR_CHECKLIST.items.length}`);
    console.log('');
    console.log('🚀 Auditors can now:');
    console.log('   1. Select this template from the checklist');
    console.log('   2. Choose a store');
    console.log('   3. Take photos for each item');
    console.log('   4. Save the audit');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding RGR checklist:', error);
    process.exit(1);
  }
}

seedRGRChecklist();

