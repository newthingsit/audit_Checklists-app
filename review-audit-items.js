const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const db = require(path.join(__dirname, 'backend', 'config', 'database-loader'));

const dbInstance = db.getDb();

console.log('\n════════════════════════════════════════════════════════════════');
console.log('🔍 AUDIT ITEMS REVIEW - Checking saved responses');
console.log('════════════════════════════════════════════════════════════════\n');

// Check audit 39 (from the error screenshot)
dbInstance.all(
  `SELECT TOP 10 ai.id, ai.item_id, ai.status, ai.selected_option_id, ai.mark, ai.comment,
          ci.title, cio.option_text, cio.mark as option_mark
   FROM audit_items ai
   JOIN checklist_items ci ON ai.item_id = ci.id
   LEFT JOIN checklist_item_options cio ON ai.selected_option_id = cio.id
   WHERE ai.audit_id IN (39, 48, 52)
   ORDER BY ai.audit_id, ai.item_id`,
  [],
  (err, items) => {
    if (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
    
    console.log('AUDIT ITEM RESPONSES:\n');
    
    items.forEach(item => {
      console.log(`Item ${item.item_id}: "${item.title}"`);
      console.log(`  Status: ${item.status}`);
      console.log(`  Selected Option ID: ${item.selected_option_id}`);
      console.log(`  Selected Option Text: ${item.option_text}`);
      console.log(`  Selected Option Mark: ${item.option_mark}`);
      console.log(`  Direct Mark: ${item.mark}`);
      console.log(`  Comment: ${item.comment || 'none'}`);
      console.log();
    });
    
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('✅ REVIEW COMPLETE\n');
    
    process.exit(0);
  }
);
