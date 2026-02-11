/**
 * Migration: Add ui_version and allow_photo to checklist_templates
 * 
 * Purpose: Standardize UI rendering across all checklists
 * - ui_version: Determines which UI is rendered (1=legacy, 2=modern with photos on options)
 * - allow_photo: Whether photo upload is allowed on option items (yes/no/na)
 * 
 * This migration fixes the bug where QA checklist uses old UI while CVR uses new UI
 * by replacing name-based logic (isCvrTemplate) with database-driven configuration.
 * 
 * ROOT CAUSE: isCvrTemplate() checked if name contained "CVR" or "CDR PLAN"
 *             QA checklist (name="New QA – CDR") didn't match, so got old UI without photos
 * 
 * SOLUTION: All checklists (including QA) get ui_version=2 and allow_photo=1 by default
 *           Frontend logic changed from checking template name to checking these fields
 *           
 * Backward compatibility: Legacy checklists that truly need V1 UI can be manually set to ui_version=1
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/audit.db');

async function migrate() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      process.exit(1);
    }
  });

  const run = (query, params = []) =>
    new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });

  const get = (query, params = []) =>
    new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

  const all = (query, params = []) =>
    new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

  try {
    console.log('Starting migration: Add ui_version and allow_photo to checklists...');

    // Check if columns already exist
    const tableInfo = await all(`PRAGMA table_info(checklist_templates)`);
    const hasUiVersion = tableInfo.some(col => col.name === 'ui_version');
    const hasAllowPhoto = tableInfo.some(col => col.name === 'allow_photo');

    if (!hasUiVersion) {
      console.log('Adding ui_version column...');
      await run(`ALTER TABLE checklist_templates ADD COLUMN ui_version INTEGER DEFAULT 2`);
      console.log('✓ ui_version column added');
    } else {
      console.log('✓ ui_version column already exists');
    }

    if (!hasAllowPhoto) {
      console.log('Adding allow_photo column...');
      await run(`ALTER TABLE checklist_templates ADD COLUMN allow_photo BOOLEAN DEFAULT 1`);
      console.log('✓ allow_photo column added');
    } else {
      console.log('✓ allow_photo column already exists');
    }

    // Update all checklists that don't have these values set
    console.log('\nUpdating existing checklists...');
    const result = await run(
      `UPDATE checklist_templates 
       SET ui_version = COALESCE(ui_version, 2), 
           allow_photo = COALESCE(allow_photo, 1)
       WHERE ui_version IS NULL OR allow_photo IS NULL`
    );
    console.log(`✓ Updated ${result.changes} checklists`);

    // Count final state
    const stats = await get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ui_version = 2 AND allow_photo = 1 THEN 1 ELSE 0 END) as v2_with_photo,
        SUM(CASE WHEN ui_version != 2 THEN 1 ELSE 0 END) as legacy_ui
      FROM checklist_templates
    `);

    console.log('\n--- Migration Summary ---');
    console.log(`Total checklists: ${stats.total}`);
    console.log(`V2 UI with photo support: ${stats.v2_with_photo}`);
    console.log(`Legacy UI (V1): ${stats.legacy_ui}`);

    // List any legacy checklists (if any exist)
    if (stats.legacy_ui > 0) {
      console.log('\nLegacy checklists (V1 UI):');
      const legacy = await all(`
        SELECT id, name, ui_version, allow_photo 
        FROM checklist_templates 
        WHERE ui_version != 2
      `);
      legacy.forEach(t => {
        console.log(`  - [#${t.id}] ${t.name} (ui_version=${t.ui_version}, allow_photo=${t.allow_photo})`);
      });
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart backend server');
    console.log('2. Test QA checklist - should now render with V2 UI and photo support');
    console.log('3. Verify photo upload works on option items for QA');
    console.log('4. Check that photos persist after save/reopen');

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    db.close();
    process.exit(1);
  }
}

// Run migration if invoked directly
if (require.main === module) {
  migrate();
}

module.exports = migrate;
