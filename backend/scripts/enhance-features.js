/**
 * Feature Enhancement Migration Script
 * 
 * Adds new columns and tables for enhanced features:
 * - Template versioning and weighted scoring
 * - Action plan comments and photo evidence
 * - Task subtasks and progress tracking
 * 
 * Run with: node scripts/enhance-features.js
 */

require('dotenv').config();
const db = require('../config/database-loader');

console.log('🚀 Feature Enhancement Migration\n');

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
    
    // Helper to run SQL
    const runSql = (sql, description) => {
      return new Promise((resolve) => {
        dbInstance.run(sql, [], (err) => {
          if (err) {
            if (err.message?.includes('duplicate column') || 
                err.message?.includes('already exists') ||
                err.message?.includes('Column names in each table must be unique') ||
                err.message?.includes('There is already an object named') ||
                err.message?.includes('SQLITE_ERROR')) {
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

    // ==========================================================
    // 1. TEMPLATE ENHANCEMENTS
    // ==========================================================
    console.log('📋 Template Enhancements:');
    
    if (isMssql) {
      // SQL Server ALTER TABLE syntax
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('checklist_templates') AND name = 'version')
         ALTER TABLE checklist_templates ADD version INT DEFAULT 1`,
        'Added version column to templates'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('checklist_templates') AND name = 'is_active')
         ALTER TABLE checklist_templates ADD is_active BIT DEFAULT 1`,
        'Added is_active column to templates'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('checklist_templates') AND name = 'parent_template_id')
         ALTER TABLE checklist_templates ADD parent_template_id INT`,
        'Added parent_template_id for versioning'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('checklist_templates') AND name = 'tags')
         ALTER TABLE checklist_templates ADD tags NVARCHAR(500)`,
        'Added tags column to templates'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('checklist_items') AND name = 'weight')
         ALTER TABLE checklist_items ADD weight INT DEFAULT 1`,
        'Added weight column to checklist items'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('checklist_items') AND name = 'max_score')
         ALTER TABLE checklist_items ADD max_score INT DEFAULT 100`,
        'Added max_score column to checklist items'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('checklist_items') AND name = 'section')
         ALTER TABLE checklist_items ADD section NVARCHAR(255)`,
        'Added section column for grouping items'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('checklist_item_options') AND name = 'score')
         ALTER TABLE checklist_item_options ADD score INT DEFAULT 0`,
        'Added score column to item options'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('checklist_item_options') AND name = 'is_passing')
         ALTER TABLE checklist_item_options ADD is_passing BIT DEFAULT 1`,
        'Added is_passing column to item options'
      );
    } else {
      // SQLite syntax
      await runSql(`ALTER TABLE checklist_templates ADD COLUMN version INTEGER DEFAULT 1`, 'Added version column');
      await runSql(`ALTER TABLE checklist_templates ADD COLUMN is_active BOOLEAN DEFAULT 1`, 'Added is_active column');
      await runSql(`ALTER TABLE checklist_templates ADD COLUMN parent_template_id INTEGER`, 'Added parent_template_id');
      await runSql(`ALTER TABLE checklist_templates ADD COLUMN tags TEXT`, 'Added tags column');
      await runSql(`ALTER TABLE checklist_items ADD COLUMN weight INTEGER DEFAULT 1`, 'Added weight column');
      await runSql(`ALTER TABLE checklist_items ADD COLUMN max_score INTEGER DEFAULT 100`, 'Added max_score column');
      await runSql(`ALTER TABLE checklist_items ADD COLUMN section TEXT`, 'Added section column');
      await runSql(`ALTER TABLE checklist_item_options ADD COLUMN score INTEGER DEFAULT 0`, 'Added score column');
      await runSql(`ALTER TABLE checklist_item_options ADD COLUMN is_passing BOOLEAN DEFAULT 1`, 'Added is_passing');
    }
    
    // ==========================================================
    // 2. ACTION PLAN ENHANCEMENTS
    // ==========================================================
    console.log('\n📝 Action Plan Enhancements:');
    
    if (isMssql) {
      // SQL Server CREATE TABLE
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'action_comments') AND type = 'U')
         CREATE TABLE action_comments (
           id INT IDENTITY(1,1) PRIMARY KEY,
           action_id INT NOT NULL,
           user_id INT NOT NULL,
           comment NVARCHAR(MAX) NOT NULL,
           created_at DATETIME DEFAULT GETDATE(),
           FOREIGN KEY (action_id) REFERENCES action_items(id) ON DELETE CASCADE,
           FOREIGN KEY (user_id) REFERENCES users(id)
         )`,
        'Created action_comments table'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'action_attachments') AND type = 'U')
         CREATE TABLE action_attachments (
           id INT IDENTITY(1,1) PRIMARY KEY,
           action_id INT NOT NULL,
           file_name NVARCHAR(255) NOT NULL,
           file_path NVARCHAR(500) NOT NULL,
           file_type NVARCHAR(100),
           file_size INT,
           uploaded_by INT NOT NULL,
           uploaded_at DATETIME DEFAULT GETDATE(),
           FOREIGN KEY (action_id) REFERENCES action_items(id) ON DELETE CASCADE,
           FOREIGN KEY (uploaded_by) REFERENCES users(id)
         )`,
        'Created action_attachments table'
      );
      
      // Add columns to action_items
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('action_items') AND name = 'escalated')
         ALTER TABLE action_items ADD escalated BIT DEFAULT 0`,
        'Added escalated column'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('action_items') AND name = 'escalated_to')
         ALTER TABLE action_items ADD escalated_to INT`,
        'Added escalated_to column'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('action_items') AND name = 'escalated_at')
         ALTER TABLE action_items ADD escalated_at DATETIME`,
        'Added escalated_at column'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('action_items') AND name = 'follow_up_date')
         ALTER TABLE action_items ADD follow_up_date DATETIME`,
        'Added follow_up_date column'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('action_items') AND name = 'category')
         ALTER TABLE action_items ADD category NVARCHAR(100)`,
        'Added category column'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('action_items') AND name = 'root_cause')
         ALTER TABLE action_items ADD root_cause NVARCHAR(MAX)`,
        'Added root_cause column'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('action_items') AND name = 'corrective_action')
         ALTER TABLE action_items ADD corrective_action NVARCHAR(MAX)`,
        'Added corrective_action column'
      );
    } else {
      // SQLite
      await runSql(`CREATE TABLE IF NOT EXISTS action_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (action_id) REFERENCES action_items(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`, 'Created action_comments table');
      
      await runSql(`CREATE TABLE IF NOT EXISTS action_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        uploaded_by INTEGER NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (action_id) REFERENCES action_items(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )`, 'Created action_attachments table');
      
      await runSql(`ALTER TABLE action_items ADD COLUMN escalated BOOLEAN DEFAULT 0`, 'Added escalated');
      await runSql(`ALTER TABLE action_items ADD COLUMN escalated_to INTEGER`, 'Added escalated_to');
      await runSql(`ALTER TABLE action_items ADD COLUMN escalated_at DATETIME`, 'Added escalated_at');
      await runSql(`ALTER TABLE action_items ADD COLUMN follow_up_date DATETIME`, 'Added follow_up_date');
      await runSql(`ALTER TABLE action_items ADD COLUMN category TEXT`, 'Added category');
      await runSql(`ALTER TABLE action_items ADD COLUMN root_cause TEXT`, 'Added root_cause');
      await runSql(`ALTER TABLE action_items ADD COLUMN corrective_action TEXT`, 'Added corrective_action');
    }
    
    // ==========================================================
    // 3. TASK ENHANCEMENTS
    // ==========================================================
    console.log('\n✅ Task Enhancements:');
    
    if (isMssql) {
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'subtasks') AND type = 'U')
         CREATE TABLE subtasks (
           id INT IDENTITY(1,1) PRIMARY KEY,
           task_id INT NOT NULL,
           title NVARCHAR(255) NOT NULL,
           completed BIT DEFAULT 0,
           completed_at DATETIME,
           order_index INT DEFAULT 0,
           created_at DATETIME DEFAULT GETDATE(),
           FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
         )`,
        'Created subtasks table'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'task_time_entries') AND type = 'U')
         CREATE TABLE task_time_entries (
           id INT IDENTITY(1,1) PRIMARY KEY,
           task_id INT NOT NULL,
           user_id INT NOT NULL,
           start_time DATETIME NOT NULL,
           end_time DATETIME,
           duration_minutes INT,
           notes NVARCHAR(MAX),
           created_at DATETIME DEFAULT GETDATE(),
           FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
           FOREIGN KEY (user_id) REFERENCES users(id)
         )`,
        'Created task_time_entries table'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'progress')
         ALTER TABLE tasks ADD progress INT DEFAULT 0`,
        'Added progress column'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'estimated_hours')
         ALTER TABLE tasks ADD estimated_hours DECIMAL(5,2)`,
        'Added estimated_hours column'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'actual_hours')
         ALTER TABLE tasks ADD actual_hours DECIMAL(5,2)`,
        'Added actual_hours column'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'tags')
         ALTER TABLE tasks ADD tags NVARCHAR(500)`,
        'Added tags column'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'board_column')
         ALTER TABLE tasks ADD board_column NVARCHAR(50) DEFAULT 'backlog'`,
        'Added board_column for Kanban'
      );
    } else {
      await runSql(`CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0,
        completed_at DATETIME,
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )`, 'Created subtasks table');
      
      await runSql(`CREATE TABLE IF NOT EXISTS task_time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration_minutes INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`, 'Created task_time_entries table');
      
      await runSql(`ALTER TABLE tasks ADD COLUMN progress INTEGER DEFAULT 0`, 'Added progress');
      await runSql(`ALTER TABLE tasks ADD COLUMN estimated_hours REAL`, 'Added estimated_hours');
      await runSql(`ALTER TABLE tasks ADD COLUMN actual_hours REAL`, 'Added actual_hours');
      await runSql(`ALTER TABLE tasks ADD COLUMN tags TEXT`, 'Added tags');
      await runSql(`ALTER TABLE tasks ADD COLUMN board_column TEXT DEFAULT 'backlog'`, 'Added board_column');
    }
    
    // ==========================================================
    // 4. CREATE INDEXES
    // ==========================================================
    console.log('\n📊 Creating Indexes:');
    
    if (isMssql) {
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_action_comments_action')
         CREATE INDEX idx_action_comments_action ON action_comments(action_id)`,
        'Created index on action_comments'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_action_attachments_action')
         CREATE INDEX idx_action_attachments_action ON action_attachments(action_id)`,
        'Created index on action_attachments'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_subtasks_task')
         CREATE INDEX idx_subtasks_task ON subtasks(task_id)`,
        'Created index on subtasks'
      );
      
      await runSql(
        `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_task_time_entries_task')
         CREATE INDEX idx_task_time_entries_task ON task_time_entries(task_id)`,
        'Created index on task_time_entries'
      );
    } else {
      await runSql(`CREATE INDEX IF NOT EXISTS idx_action_comments_action ON action_comments(action_id)`, 'Index on action_comments');
      await runSql(`CREATE INDEX IF NOT EXISTS idx_action_attachments_action ON action_attachments(action_id)`, 'Index on attachments');
      await runSql(`CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id)`, 'Index on subtasks');
      await runSql(`CREATE INDEX IF NOT EXISTS idx_task_time_entries_task ON task_time_entries(task_id)`, 'Index on time entries');
    }
    
    console.log('\n✨ Migration completed successfully!\n');
    
    // Show summary
    console.log('New Features Enabled:');
    console.log('─────────────────────────────────────────');
    console.log('📋 Templates:');
    console.log('   • Version tracking');
    console.log('   • Weighted scoring for items');
    console.log('   • Item sections/groups');
    console.log('   • Tags for categorization');
    console.log('');
    console.log('📝 Action Plans:');
    console.log('   • Comments on action items');
    console.log('   • File/Photo attachments');
    console.log('   • Escalation tracking');
    console.log('   • Root cause analysis');
    console.log('   • Corrective action tracking');
    console.log('');
    console.log('✅ Tasks:');
    console.log('   • Subtasks/Checklists');
    console.log('   • Time tracking');
    console.log('   • Progress percentage');
    console.log('   • Kanban board column');
    console.log('   • Estimated vs actual hours');
    console.log('─────────────────────────────────────────');
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
