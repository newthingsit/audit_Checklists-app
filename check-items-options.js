const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const db = require(path.join(__dirname, 'backend', 'config', 'database-loader'));

async function checkItemsAndOptions() {
  try {
    const dbInstance = db.getDb();
    
    // Get all items from template 44
    dbInstance.all(
      `SELECT ci.id, ci.title, ci.input_type, ci.category
       FROM checklist_items ci
       WHERE ci.template_id = 44
       ORDER BY ci.id`,
      [],
      (err, items) => {
        if (err) {
          console.error('Error:', err.message);
          return;
        }
        
        console.log(`\nFound ${items.length} items for template 44:\n`);
        items.forEach(item => {
          console.log(`Item ${item.id}:`);
          console.log(`  Title: ${item.title}`);
          console.log(`  Input Type: ${item.input_type || 'NULL'}`);
          console.log(`  Category: ${item.category || 'NULL'}`);
          
          // Get options for this item
          dbInstance.all(
            `SELECT id, option_text, mark, order_index
             FROM checklist_item_options
             WHERE item_id = ?
             ORDER BY order_index`,
            [item.id],
            (err2, options) => {
              if (err2) {
                console.error('  Error fetching options:', err2.message);
              } else {
                console.log(`  Options: ${options.length}`);
                options.forEach(opt => {
                  console.log(`    - ${opt.option_text}: ${opt.mark} (id:${opt.id})`);
                });
              }
              console.log();
            }
          );
        });
      }
    );
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkItemsAndOptions();
