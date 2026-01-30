const db = require('../config/database-loader');

const dbInstance = db.getDb();

dbInstance.all(
  `SELECT id, name, description, created_at 
   FROM checklist_templates 
   WHERE name LIKE '%CVR%' OR name LIKE '%CDR%'
   ORDER BY id`,
  [],
  (err, templates) => {
    if (err) {
      console.error('Error querying templates:', err);
      process.exit(1);
    }
    
    console.log('\n=== CVR/CDR Checklist Templates ===\n');
    console.log(JSON.stringify(templates, null, 2));
    console.log(`\nTotal: ${templates.length} template(s)\n`);
    
    // Get item counts for each template
    const promises = templates.map(template => {
      return new Promise((resolve) => {
        dbInstance.get(
          `SELECT COUNT(*) as item_count FROM checklist_items WHERE template_id = ?`,
          [template.id],
          (err, result) => {
            if (err) {
              console.error(`Error counting items for template ${template.id}:`, err);
              resolve({ ...template, item_count: 'Error' });
            } else {
              resolve({ ...template, item_count: result.item_count });
            }
          }
        );
      });
    });
    
    Promise.all(promises).then(results => {
      console.log('=== Template Details with Item Counts ===\n');
      results.forEach(t => {
        console.log(`ID: ${t.id}`);
        console.log(`Name: ${t.name}`);
        console.log(`Items: ${t.item_count}`);
        console.log(`Created: ${t.created_at}`);
        console.log('---');
      });
      process.exit(0);
    });
  }
);
