/**
 * Add Store Groups Feature Migration
 * 
 * Creates store_groups table and adds group_id to locations
 * 
 * Run with: node scripts/add-store-groups.js
 */

require('dotenv').config();
const db = require('../config/database-loader');

console.log('🏪 Adding Store Groups Feature...\n');

async function runMigration() {
  try {
    if (typeof db.init === 'function') {
      await db.init();
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const dbInstance = db.getDb();
    const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
    const isMssql = dbType === 'mssql' || dbType === 'sqlserver';
    
    if (!dbInstance) {
      throw new Error('Database not initialized');
    }
    
    console.log(`Database type: ${dbType}\n`);
    
    const runSql = (sql, description) => {
      return new Promise((resolve) => {
        dbInstance.run(sql, [], (err) => {
          if (err) {
            if (err.message?.includes('already exists') || 
                err.message?.includes('duplicate column') ||
                err.message?.includes('Column names in each table must be unique')) {
              console.log(`  ⏭️  ${description} (already exists)`);
            } else {
              console.log(`  ❌ ${description}: ${err.message}`);
            }
          } else {
            console.log(`  ✅ ${description}`);
          }
          resolve();
        });
      });
    };

    console.log('Creating Store Groups table:');
    
    if (isMssql) {
      await runSql(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'store_groups') AND type = 'U')
        CREATE TABLE store_groups (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(255) NOT NULL,
          code NVARCHAR(50),
          type NVARCHAR(50) DEFAULT 'region',
          description NVARCHAR(MAX),
          parent_group_id INT,
          color NVARCHAR(20),
          icon NVARCHAR(50),
          is_active BIT DEFAULT 1,
          sort_order INT DEFAULT 0,
          created_by INT,
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE(),
          FOREIGN KEY (parent_group_id) REFERENCES store_groups(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`,
        'Created store_groups table'
      );
      
      await runSql(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('locations') AND name = 'group_id')
        ALTER TABLE locations ADD group_id INT`,
        'Added group_id to locations'
      );
      
      await runSql(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('locations') AND name = 'brand')
        ALTER TABLE locations ADD brand NVARCHAR(100)`,
        'Added brand to locations'
      );
      
      await runSql(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_locations_group')
        CREATE INDEX idx_locations_group ON locations(group_id)`,
        'Created index on locations.group_id'
      );
      
      await runSql(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_store_groups_parent')
        CREATE INDEX idx_store_groups_parent ON store_groups(parent_group_id)`,
        'Created index on store_groups.parent_group_id'
      );
      
      await runSql(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_store_groups_type')
        CREATE INDEX idx_store_groups_type ON store_groups(type)`,
        'Created index on store_groups.type'
      );
    } else {
      await runSql(`
        CREATE TABLE IF NOT EXISTS store_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          code TEXT,
          type TEXT DEFAULT 'region',
          description TEXT,
          parent_group_id INTEGER,
          color TEXT,
          icon TEXT,
          is_active BOOLEAN DEFAULT 1,
          sort_order INTEGER DEFAULT 0,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_group_id) REFERENCES store_groups(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`,
        'Created store_groups table'
      );
      
      await runSql(`ALTER TABLE locations ADD COLUMN group_id INTEGER`, 'Added group_id to locations');
      await runSql(`ALTER TABLE locations ADD COLUMN brand TEXT`, 'Added brand to locations');
      await runSql(`CREATE INDEX IF NOT EXISTS idx_locations_group ON locations(group_id)`, 'Created index');
      await runSql(`CREATE INDEX IF NOT EXISTS idx_store_groups_parent ON store_groups(parent_group_id)`, 'Created parent index');
      await runSql(`CREATE INDEX IF NOT EXISTS idx_store_groups_type ON store_groups(type)`, 'Created type index');
    }
    
    console.log('\n✨ Store Groups feature added successfully!\n');
    console.log('Group Types Available:');
    console.log('  • region - Geographic regions');
    console.log('  • district - Districts within regions');
    console.log('  • brand - Brand/Concept grouping');
    console.log('  • franchise - Franchise grouping');
    console.log('  • custom - Custom grouping');
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();

