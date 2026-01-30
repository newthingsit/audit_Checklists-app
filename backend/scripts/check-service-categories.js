const db = require('../config/database-loader');

const dbInstance = db.getDb();

dbInstance.all(
  `SELECT DISTINCT category, subcategory, section 
   FROM checklist_items 
   WHERE template_id = 43 
     AND category = 'SERVICE'
   ORDER BY subcategory, section`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    console.log('\n=== SERVICE Category Subcategories ===\n');
    console.log(JSON.stringify(rows, null, 2));
    
    // Also check for Speed of Service specifically
    dbInstance.all(
      `SELECT id, title, subcategory, section, required 
       FROM checklist_items 
       WHERE template_id = 43 
         AND (subcategory LIKE '%Speed%' OR section LIKE '%Trnx%')
       ORDER BY order_index`,
      [],
      (err2, speedItems) => {
        console.log('\n=== Speed of Service Items ===\n');
        if (err2) {
          console.error('Error:', err2);
        } else {
          console.log(JSON.stringify(speedItems, null, 2));
        }
        process.exit(0);
      }
    );
  }
);
