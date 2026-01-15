/**
 * Script to check if templates exist in the database
 * Run with: node scripts/check-templates.js
 */

require('dotenv').config();
const db = require('../config/database-loader');

const checkTemplates = () => {
  return new Promise((resolve, reject) => {
    const dbInstance = db.getDb();
    const dbType = process.env.DB_TYPE ? process.env.DB_TYPE.toLowerCase() : 'sqlite';
    
    console.log('Database Type:', dbType);
    console.log('Checking for templates in checklist_templates table...\n');
    
    // Simple query to get all templates
    let query;
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query = `SELECT id, name, category, description, created_by, created_at 
               FROM checklist_templates 
               ORDER BY created_at DESC`;
    } else {
      query = `SELECT id, name, category, description, created_by, created_at 
               FROM checklist_templates 
               ORDER BY created_at DESC`;
    }
    
    dbInstance.all(query, [], (err, templates) => {
      if (err) {
        console.error('Error querying templates:', err);
        return reject(err);
      }
      
      if (!templates || templates.length === 0) {
        console.log('❌ No templates found in the database.');
        console.log('\nThe checklist_templates table is empty.');
        console.log('You can create templates by:');
        console.log('  1. Using the web app: Click "+ Add Template" button');
        console.log('  2. Importing CSV: Click "Import CSV" button');
        console.log('  3. Using the API: POST to /api/checklists');
      } else {
        console.log(`✅ Found ${templates.length} template(s):\n`);
        templates.forEach((template, index) => {
          console.log(`${index + 1}. ID: ${template.id}`);
          console.log(`   Name: ${template.name}`);
          console.log(`   Category: ${template.category || 'N/A'}`);
          console.log(`   Created By: ${template.created_by || 'N/A'}`);
          console.log(`   Created At: ${template.created_at || 'N/A'}`);
          console.log(`   Description: ${template.description ? template.description.substring(0, 50) + '...' : 'N/A'}`);
          console.log('');
        });
        
        // Also check for items
        console.log('Checking for template items...\n');
        const templateIds = templates.map(t => t.id);
        const placeholders = templateIds.map(() => '?').join(',');
        const itemsQuery = `SELECT template_id, COUNT(*) as item_count 
                           FROM checklist_items 
                           WHERE template_id IN (${placeholders})
                           GROUP BY template_id`;
        
        dbInstance.all(itemsQuery, templateIds, (itemsErr, itemCounts) => {
          if (itemsErr) {
            console.error('Error querying items:', itemsErr);
          } else {
            const countMap = {};
            itemCounts.forEach(row => {
              countMap[row.template_id] = row.item_count;
            });
            
            templates.forEach(template => {
              const count = countMap[template.id] || 0;
              console.log(`Template "${template.name}" has ${count} item(s)`);
            });
          }
          
          resolve(templates);
        });
      }
    });
  });
};

// Run the check
checkTemplates()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
