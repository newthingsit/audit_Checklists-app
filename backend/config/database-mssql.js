// SQL Server Database Configuration
const sql = require('mssql');

let pool = null;

const init = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const config = {
        server: process.env.DB_HOST || process.env.MSSQL_SERVER || 'localhost\\SQLEXPRESS',
        port: parseInt(process.env.DB_PORT || process.env.MSSQL_PORT || '1433'),
        database: process.env.DB_NAME || process.env.MSSQL_DATABASE || 'audit_checklists',
        user: process.env.DB_USER || process.env.MSSQL_USER || 'sa',
        password: process.env.DB_PASSWORD || process.env.MSSQL_PASSWORD,
        options: {
          encrypt: process.env.MSSQL_ENCRYPT === 'true',
          trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true' || true,
          enableArithAbort: true,
          connectionTimeout: 30000,
          requestTimeout: 30000
        },
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000
        }
      };

      pool = await sql.connect(config);
      console.log('Connected to SQL Server database');
      await createTables();
      resolve();
    } catch (error) {
      console.error('SQL Server initialization error:', error);
      reject(error);
    }
  });
};

const createTables = async () => {
  const queries = [
    // Roles table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[roles]') AND type in (N'U'))
    CREATE TABLE [dbo].[roles] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [name] NVARCHAR(255) UNIQUE NOT NULL,
      [display_name] NVARCHAR(255) NOT NULL,
      [description] NTEXT,
      [is_system_role] BIT DEFAULT 0,
      [permissions] NTEXT,
      [created_at] DATETIME DEFAULT GETDATE()
    )`,
    
    // Users table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND type in (N'U'))
    CREATE TABLE [dbo].[users] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [email] NVARCHAR(255) UNIQUE NOT NULL,
      [password] NVARCHAR(255) NOT NULL,
      [name] NVARCHAR(255) NOT NULL,
      [role] NVARCHAR(50) DEFAULT 'user',
      [created_at] DATETIME DEFAULT GETDATE()
    )`,
    
    // Checklist Templates table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[checklist_templates]') AND type in (N'U'))
    CREATE TABLE [dbo].[checklist_templates] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [name] NVARCHAR(255) NOT NULL,
      [category] NVARCHAR(255) NOT NULL,
      [description] NTEXT,
      [created_by] INT,
      [created_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([created_by]) REFERENCES [users]([id])
    )`,
    
    // Checklist Items table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[checklist_items]') AND type in (N'U'))
    CREATE TABLE [dbo].[checklist_items] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [template_id] INT NOT NULL,
      [title] NVARCHAR(255) NOT NULL,
      [description] NTEXT,
      [category] NVARCHAR(255),
      [required] BIT DEFAULT 1,
      [order_index] INT DEFAULT 0,
      FOREIGN KEY ([template_id]) REFERENCES [checklist_templates]([id]) ON DELETE CASCADE
    )`,
    
    // Checklist Item Options table (for marking system)
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[checklist_item_options]') AND type in (N'U'))
    CREATE TABLE [dbo].[checklist_item_options] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [item_id] INT NOT NULL,
      [option_text] NVARCHAR(255) NOT NULL,
      [mark] NVARCHAR(10) NOT NULL,
      [order_index] INT DEFAULT 0,
      FOREIGN KEY ([item_id]) REFERENCES [checklist_items]([id]) ON DELETE CASCADE
    )`,
    
    // Locations table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[locations]') AND type in (N'U'))
    CREATE TABLE [dbo].[locations] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [store_number] NVARCHAR(50),
      [name] NVARCHAR(255) NOT NULL,
      [address] NTEXT,
      [city] NVARCHAR(255),
      [state] NVARCHAR(255),
      [country] NVARCHAR(255),
      [phone] NVARCHAR(50),
      [email] NVARCHAR(255),
      [parent_id] INT,
      [region] NVARCHAR(255),
      [district] NVARCHAR(255),
      [created_by] INT,
      [created_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([created_by]) REFERENCES [users]([id]),
      FOREIGN KEY ([parent_id]) REFERENCES [locations]([id]) ON DELETE SET NULL
    )`,
    
    // Audits table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[audits]') AND type in (N'U'))
    CREATE TABLE [dbo].[audits] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [template_id] INT NOT NULL,
      [user_id] INT NOT NULL,
      [restaurant_name] NVARCHAR(255) NOT NULL,
      [location] NTEXT,
      [location_id] INT,
      [team_id] INT,
      [scheduled_audit_id] INT,
      [status] NVARCHAR(50) DEFAULT 'in_progress',
      [score] INT,
      [total_items] INT,
      [completed_items] INT DEFAULT 0,
      [notes] NTEXT,
      [is_mystery_shopper] BIT DEFAULT 0,
      [created_at] DATETIME DEFAULT GETDATE(),
      [completed_at] DATETIME NULL,
      FOREIGN KEY ([template_id]) REFERENCES [checklist_templates]([id]),
      FOREIGN KEY ([user_id]) REFERENCES [users]([id]),
      FOREIGN KEY ([team_id]) REFERENCES [teams]([id]),
      FOREIGN KEY ([location_id]) REFERENCES [locations]([id])
    )`,
    
    // Audit Items table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[audit_items]') AND type in (N'U'))
    CREATE TABLE [dbo].[audit_items] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [audit_id] INT NOT NULL,
      [item_id] INT NOT NULL,
      [status] NVARCHAR(50) DEFAULT 'pending',
      [selected_option_id] INT,
      [mark] NVARCHAR(10),
      [comment] NTEXT,
      [photo_url] NTEXT,
      [completed_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([audit_id]) REFERENCES [audits]([id]) ON DELETE CASCADE,
      FOREIGN KEY ([item_id]) REFERENCES [checklist_items]([id]),
      FOREIGN KEY ([selected_option_id]) REFERENCES [checklist_item_options]([id])
    )`,
    
    // Action Items table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[action_items]') AND type in (N'U'))
    CREATE TABLE [dbo].[action_items] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [audit_id] INT NOT NULL,
      [item_id] INT,
      [title] NVARCHAR(255) NOT NULL,
      [description] NTEXT,
      [priority] NVARCHAR(50) DEFAULT 'medium',
      [status] NVARCHAR(50) DEFAULT 'pending',
      [assigned_to] INT,
      [due_date] DATETIME NULL,
      [created_at] DATETIME DEFAULT GETDATE(),
      [completed_at] DATETIME NULL,
      FOREIGN KEY ([audit_id]) REFERENCES [audits]([id]) ON DELETE CASCADE,
      FOREIGN KEY ([item_id]) REFERENCES [checklist_items]([id]),
      FOREIGN KEY ([assigned_to]) REFERENCES [users]([id])
    )`,
    
    // Scheduled Audits table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[scheduled_audits]') AND type in (N'U'))
    CREATE TABLE [dbo].[scheduled_audits] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [template_id] INT NOT NULL,
      [location_id] INT,
      [assigned_to] INT,
      [scheduled_date] DATE NOT NULL,
      [frequency] NVARCHAR(50) DEFAULT 'once',
      [next_run_date] DATE,
      [status] NVARCHAR(50) DEFAULT 'pending',
      [created_by] INT NOT NULL,
      [created_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([template_id]) REFERENCES [checklist_templates]([id]),
      FOREIGN KEY ([location_id]) REFERENCES [locations]([id]),
      FOREIGN KEY ([assigned_to]) REFERENCES [users]([id]),
      FOREIGN KEY ([created_by]) REFERENCES [users]([id])
    )`,
    
    // Reschedule Tracking table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[reschedule_tracking]') AND type in (N'U'))
    CREATE TABLE [dbo].[reschedule_tracking] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [scheduled_audit_id] INT NOT NULL,
      [user_id] INT NOT NULL,
      [old_date] DATE NOT NULL,
      [new_date] DATE NOT NULL,
      [reschedule_month] NVARCHAR(7) NOT NULL,
      [created_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([scheduled_audit_id]) REFERENCES [scheduled_audits]([id]) ON DELETE CASCADE,
      FOREIGN KEY ([user_id]) REFERENCES [users]([id])
    )`,
    
    // Tasks table (for workflow management)
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tasks]') AND type in (N'U'))
    CREATE TABLE [dbo].[tasks] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [title] NVARCHAR(255) NOT NULL,
      [description] NTEXT,
      [type] NVARCHAR(50) DEFAULT 'general',
      [status] NVARCHAR(50) DEFAULT 'pending',
      [priority] NVARCHAR(50) DEFAULT 'medium',
      [assigned_to] INT,
      [created_by] INT NOT NULL,
      [team_id] INT,
      [action_item_id] INT,
      [due_date] DATETIME,
      [reminder_date] DATETIME,
      [completed_at] DATETIME,
      [workflow_id] INT,
      [depends_on_task_id] INT,
      [location_id] INT,
      [audit_id] INT,
      [metadata] NTEXT,
      [created_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([assigned_to]) REFERENCES [users]([id]),
      FOREIGN KEY ([created_by]) REFERENCES [users]([id]),
      FOREIGN KEY ([team_id]) REFERENCES [teams]([id]),
      FOREIGN KEY ([action_item_id]) REFERENCES [action_items]([id]),
      FOREIGN KEY ([depends_on_task_id]) REFERENCES [tasks]([id]),
      FOREIGN KEY ([location_id]) REFERENCES [locations]([id]),
      FOREIGN KEY ([audit_id]) REFERENCES [audits]([id])
    )`,
    
    // Task Dependencies table (for complex dependency chains)
    // Drop table if it exists (to fix foreign key constraint issue)
    `IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[task_dependencies]') AND type in (N'U'))
    DROP TABLE [dbo].[task_dependencies]`,
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[task_dependencies]') AND type in (N'U'))
    CREATE TABLE [dbo].[task_dependencies] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [task_id] INT NOT NULL,
      [depends_on_task_id] INT NOT NULL,
      [created_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([task_id]) REFERENCES [tasks]([id]) ON DELETE CASCADE,
      FOREIGN KEY ([depends_on_task_id]) REFERENCES [tasks]([id]) ON DELETE NO ACTION,
      CONSTRAINT [unique_dependency] UNIQUE ([task_id], [depends_on_task_id])
    )`,
    
    // Teams table (for team/department management)
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[teams]') AND type in (N'U'))
    CREATE TABLE [dbo].[teams] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [name] NVARCHAR(255) NOT NULL,
      [description] NTEXT,
      [team_lead_id] INT,
      [created_by] INT NOT NULL,
      [created_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([team_lead_id]) REFERENCES [users]([id]),
      FOREIGN KEY ([created_by]) REFERENCES [users]([id])
    )`,
    
    // Team Members junction table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[team_members]') AND type in (N'U'))
    CREATE TABLE [dbo].[team_members] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [team_id] INT NOT NULL,
      [user_id] INT NOT NULL,
      [role] NVARCHAR(50) DEFAULT 'member',
      [joined_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([team_id]) REFERENCES [teams]([id]) ON DELETE CASCADE,
      FOREIGN KEY ([user_id]) REFERENCES [users]([id]) ON DELETE CASCADE,
      CONSTRAINT [unique_team_member] UNIQUE ([team_id], [user_id])
    )`,
    
    // Notifications table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[notifications]') AND type in (N'U'))
    CREATE TABLE [dbo].[notifications] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [user_id] INT NOT NULL,
      [type] NVARCHAR(50) NOT NULL,
      [title] NVARCHAR(255) NOT NULL,
      [message] NTEXT NOT NULL,
      [link] NTEXT,
      [read] BIT DEFAULT 0,
      [created_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([user_id]) REFERENCES [users]([id]) ON DELETE CASCADE
    )`,
    
    // User preferences table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[user_preferences]') AND type in (N'U'))
    CREATE TABLE [dbo].[user_preferences] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [user_id] INT NOT NULL UNIQUE,
      [email_notifications_enabled] BIT DEFAULT 1,
      [email_audit_completed] BIT DEFAULT 1,
      [email_action_assigned] BIT DEFAULT 1,
      [email_task_reminder] BIT DEFAULT 1,
      [email_overdue_items] BIT DEFAULT 1,
      [email_scheduled_audit] BIT DEFAULT 1,
      [date_format] NVARCHAR(20) DEFAULT N'DD-MM-YYYY',
      [items_per_page] INT DEFAULT 25,
      [theme] NVARCHAR(20) DEFAULT N'light',
      [dashboard_default_view] NVARCHAR(20) DEFAULT N'cards',
      [created_at] DATETIME DEFAULT GETDATE(),
      [updated_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([user_id]) REFERENCES [users]([id]) ON DELETE CASCADE
    )`
  ];

  try {
    for (const query of queries) {
      await pool.request().query(query);
    }
    console.log('SQL Server tables created/verified');
    
    // Add missing columns to existing tables (migration)
    await addMissingColumns();
    
    // Create performance indexes
    await createIndexes();
  } catch (error) {
    console.error('Error creating SQL Server tables:', error);
    throw error;
  }
};

// Create indexes for better query performance
const createIndexes = async () => {
  const indexes = [
    // Audits table indexes
    { table: 'audits', name: 'idx_audits_user_id', columns: 'user_id' },
    { table: 'audits', name: 'idx_audits_status', columns: 'status' },
    { table: 'audits', name: 'idx_audits_scheduled_id', columns: 'scheduled_audit_id' },
    { table: 'audits', name: 'idx_audits_template_id', columns: 'template_id' },
    { table: 'audits', name: 'idx_audits_location_id', columns: 'location_id' },
    { table: 'audits', name: 'idx_audits_created_at', columns: 'created_at' },
    
    // Scheduled audits indexes
    { table: 'scheduled_audits', name: 'idx_scheduled_assigned_to', columns: 'assigned_to' },
    { table: 'scheduled_audits', name: 'idx_scheduled_status', columns: 'status' },
    { table: 'scheduled_audits', name: 'idx_scheduled_date', columns: 'scheduled_date' },
    { table: 'scheduled_audits', name: 'idx_scheduled_created_by', columns: 'created_by' },
    
    // Audit items indexes
    { table: 'audit_items', name: 'idx_audit_items_audit_id', columns: 'audit_id' },
    { table: 'audit_items', name: 'idx_audit_items_item_id', columns: 'item_id' },
    
    // Action items indexes
    { table: 'action_items', name: 'idx_action_items_audit_id', columns: 'audit_id' },
    { table: 'action_items', name: 'idx_action_items_assigned_to', columns: 'assigned_to' },
    { table: 'action_items', name: 'idx_action_items_status', columns: 'status' },
    
    // Tasks indexes
    { table: 'tasks', name: 'idx_tasks_assigned_to', columns: 'assigned_to' },
    { table: 'tasks', name: 'idx_tasks_status', columns: 'status' },
    { table: 'tasks', name: 'idx_tasks_created_by', columns: 'created_by' },
    
    // Notifications indexes
    { table: 'notifications', name: 'idx_notifications_user_id', columns: 'user_id' },
    { table: 'notifications', name: 'idx_notifications_read', columns: '[read]' },
    
    // Locations indexes
    { table: 'locations', name: 'idx_locations_store_number', columns: 'store_number' },
    
    // Checklist items indexes
    { table: 'checklist_items', name: 'idx_checklist_items_template', columns: 'template_id' },
    
    // Users index on email
    { table: 'users', name: 'idx_users_email', columns: 'email' },
    
    // Reschedule tracking indexes
    { table: 'reschedule_tracking', name: 'idx_reschedule_user_month', columns: 'user_id, reschedule_month' }
  ];

  for (const idx of indexes) {
    try {
      // Check if index already exists
      const checkResult = await pool.request().query(`
        SELECT COUNT(*) as count 
        FROM sys.indexes 
        WHERE name = '${idx.name}' AND object_id = OBJECT_ID('${idx.table}')
      `);
      
      if (checkResult.recordset[0].count === 0) {
        await pool.request().query(`
          CREATE NONCLUSTERED INDEX [${idx.name}] ON [dbo].[${idx.table}] (${idx.columns})
        `);
      }
    } catch (err) {
      // Silently ignore index creation errors (table might not exist yet)
    }
  }
};

// Add missing columns to existing tables (for migrations)
const addMissingColumns = async () => {
  const request = pool.request();
  
  try {
    // Check and add team_id to audits table
    const checkTeamId = await request.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'audits' AND COLUMN_NAME = 'team_id'
    `);
    
    if (checkTeamId.recordset[0].count === 0) {
      console.log('Adding team_id column to audits table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[audits] 
          ADD [team_id] INT NULL;
        `);
        
        // Check if teams table exists before adding foreign key
        const teamsTableCheck = await pool.request().query(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = 'teams'
        `);
        
        if (teamsTableCheck.recordset[0].count > 0) {
          // Check if constraint already exists
          const constraintCheck = await pool.request().query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_NAME = 'audits' AND CONSTRAINT_NAME = 'FK_audits_teams'
          `);
          
          if (constraintCheck.recordset[0].count === 0) {
            await pool.request().query(`
              ALTER TABLE [dbo].[audits]
              ADD CONSTRAINT [FK_audits_teams] 
              FOREIGN KEY ([team_id]) REFERENCES [teams]([id]);
            `);
          }
        }
        console.log('team_id column added to audits table');
      } catch (err) {
        console.warn('Error adding team_id to audits:', err.message);
      }
    }
    
    // Check and add action_item_id to tasks table
    const checkActionItemId = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'tasks' AND COLUMN_NAME = 'action_item_id'
    `);
    
    if (checkActionItemId.recordset[0].count === 0) {
      console.log('Adding action_item_id column to tasks table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[tasks] 
          ADD [action_item_id] INT NULL;
        `);
        
        // Check if action_items table exists before adding foreign key
        const actionItemsTableCheck = await pool.request().query(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = 'action_items'
        `);
        
        if (actionItemsTableCheck.recordset[0].count > 0) {
          const constraintCheck = await pool.request().query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_NAME = 'tasks' AND CONSTRAINT_NAME = 'FK_tasks_action_items'
          `);
          
          if (constraintCheck.recordset[0].count === 0) {
            await pool.request().query(`
              ALTER TABLE [dbo].[tasks]
              ADD CONSTRAINT [FK_tasks_action_items] 
              FOREIGN KEY ([action_item_id]) REFERENCES [action_items]([id]);
            `);
          }
        }
        console.log('action_item_id column added to tasks table');
      } catch (err) {
        console.warn('Error adding action_item_id to tasks:', err.message);
      }
    }
    
    // Check and add scheduled_audit_id to audits table
    const checkAuditsScheduled = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'audits' AND COLUMN_NAME = 'scheduled_audit_id'
    `);
    
    if (checkAuditsScheduled.recordset[0].count === 0) {
      console.log('Adding scheduled_audit_id column to audits table...');
      await pool.request().query(`
        ALTER TABLE [dbo].[audits] 
        ADD [scheduled_audit_id] INT NULL;
      `);
      console.log('scheduled_audit_id column added to audits table');
    }
    
    // Check and add team_id to tasks table
    const checkTasksTeamId = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'tasks' AND COLUMN_NAME = 'team_id'
    `);
    
    if (checkTasksTeamId.recordset[0].count === 0) {
      console.log('Adding team_id column to tasks table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[tasks] 
          ADD [team_id] INT NULL;
        `);
        
        // Check if teams table exists before adding foreign key
        const teamsTableCheck = await pool.request().query(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = 'teams'
        `);
        
        if (teamsTableCheck.recordset[0].count > 0) {
          const constraintCheck = await pool.request().query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_NAME = 'tasks' AND CONSTRAINT_NAME = 'FK_tasks_teams'
          `);
          
          if (constraintCheck.recordset[0].count === 0) {
            await pool.request().query(`
              ALTER TABLE [dbo].[tasks]
              ADD CONSTRAINT [FK_tasks_teams] 
              FOREIGN KEY ([team_id]) REFERENCES [teams]([id]);
            `);
          }
        }
        console.log('team_id column added to tasks table');
      } catch (err) {
        console.warn('Error adding team_id to tasks:', err.message);
      }
    }
    
    // Check and add selected_option_id and mark to audit_items table
    const checkAuditItems = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'audit_items'
    `);
    
    const auditItemsColumns = checkAuditItems.recordset.map(r => r.COLUMN_NAME);
    
    if (!auditItemsColumns.includes('selected_option_id')) {
      console.log('Adding selected_option_id column to audit_items table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[audit_items] 
          ADD [selected_option_id] INT NULL;
        `);
        
        // Check if checklist_item_options table exists before adding foreign key
        const optionsTableCheck = await pool.request().query(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = 'checklist_item_options'
        `);
        
        if (optionsTableCheck.recordset[0].count > 0) {
          const constraintCheck = await pool.request().query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_NAME = 'audit_items' AND CONSTRAINT_NAME = 'FK_audit_items_options'
          `);
          
          if (constraintCheck.recordset[0].count === 0) {
            await pool.request().query(`
              ALTER TABLE [dbo].[audit_items]
              ADD CONSTRAINT [FK_audit_items_options] 
              FOREIGN KEY ([selected_option_id]) REFERENCES [checklist_item_options]([id]);
            `);
          }
        }
        console.log('selected_option_id column added to audit_items table');
      } catch (err) {
        console.warn('Error adding selected_option_id to audit_items:', err.message);
      }
    }
    
    if (!auditItemsColumns.includes('mark')) {
      console.log('Adding mark column to audit_items table...');
      await pool.request().query(`
        ALTER TABLE [dbo].[audit_items] 
        ADD [mark] NVARCHAR(10) NULL;
      `);
      console.log('mark column added to audit_items table');
    }
    
    // Check and add store_number and created_by to locations table
    const checkLocations = await request.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'locations'
    `);
    
    const locationColumns = checkLocations.recordset.map(r => r.COLUMN_NAME);
    
    if (!locationColumns.includes('store_number')) {
      console.log('Adding store_number column to locations table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[locations] 
          ADD [store_number] NVARCHAR(50) NULL;
        `);
        console.log('store_number column added to locations table');
      } catch (err) {
        console.warn('Error adding store_number to locations:', err.message);
      }
    }
    
    if (!locationColumns.includes('created_by')) {
      console.log('Adding created_by column to locations table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[locations] 
          ADD [created_by] INT NULL;
        `);
        
        // Check if users table exists before adding foreign key
        const usersTableCheck = await pool.request().query(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = 'users'
        `);
        
        if (usersTableCheck.recordset[0].count > 0) {
          const constraintCheck = await pool.request().query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_NAME = 'locations' AND CONSTRAINT_NAME = 'FK_locations_users'
          `);
          
          if (constraintCheck.recordset[0].count === 0) {
            await pool.request().query(`
              ALTER TABLE [dbo].[locations]
              ADD CONSTRAINT [FK_locations_users] 
              FOREIGN KEY ([created_by]) REFERENCES [users]([id]);
            `);
          }
        }
        console.log('created_by column added to locations table');
      } catch (err) {
        console.warn('Error adding created_by to locations:', err.message);
      }
    }
    
  } catch (error) {
    // Don't throw error for migration issues, just log them
    console.warn('Warning: Some column migrations may have failed:', error.message);
  }
};

// Database query methods (compatible with SQLite interface)
const getDb = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call db.init() first.');
  }
  return {
    // Run a query (for INSERT, UPDATE, DELETE)
    run: (query, params = [], callback) => {
      const request = pool.request();
      
      // Check if it's an INSERT statement and add SCOPE_IDENTITY() to get last inserted ID
      const isInsert = query.trim().toUpperCase().startsWith('INSERT');
      let processedQuery = query;
      
      if (isInsert && !query.includes('OUTPUT') && !query.includes('SCOPE_IDENTITY')) {
        // For INSERT, append SELECT SCOPE_IDENTITY() to get the last inserted ID
        processedQuery = query + '; SELECT SCOPE_IDENTITY() AS id;';
      }
      
      // Add parameters
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
      
      // Replace ? with @param0, @param1, etc. (replace all occurrences in order)
      let paramIndex = 0;
      processedQuery = processedQuery.replace(/\?/g, () => {
        const replacement = `@param${paramIndex}`;
        paramIndex++;
        return replacement;
      });
      
      if (callback) {
        request.query(processedQuery)
          .then(result => {
            let lastID = 0;
            if (isInsert && result.recordset && result.recordset.length > 0) {
              // Get the ID from the SCOPE_IDENTITY() result
              const idResult = result.recordset.find(r => r.id !== undefined);
              if (idResult) {
                lastID = parseInt(idResult.id) || 0;
              }
            }
            callback(null, {
              lastID: lastID,
              changes: result.rowsAffected[0] || 0
            });
          })
          .catch(callback);
      } else {
        return request.query(processedQuery)
          .then(result => {
            let lastID = 0;
            if (isInsert && result.recordset && result.recordset.length > 0) {
              const idResult = result.recordset.find(r => r.id !== undefined);
              if (idResult) {
                lastID = parseInt(idResult.id) || 0;
              }
            }
            return {
              lastID: lastID,
              changes: result.rowsAffected[0] || 0
            };
          });
      }
    },

    // Get a single row
    get: (query, params = [], callback) => {
      const request = pool.request();
      
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
      
      let processedQuery = query;
      // Replace ? with @param0, @param1, etc. (replace all occurrences in order)
      let paramIndex = 0;
      processedQuery = processedQuery.replace(/\?/g, () => {
        const replacement = `@param${paramIndex}`;
        paramIndex++;
        return replacement;
      });
      
      if (callback) {
        request.query(processedQuery)
          .then(result => {
            callback(null, result.recordset[0] || null);
          })
          .catch(callback);
      } else {
        return request.query(processedQuery)
          .then(result => result.recordset[0] || null);
      }
    },

    // Get all rows
    all: (query, params = [], callback) => {
      const request = pool.request();
      
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
      
      let processedQuery = query;
      // Replace ? with @param0, @param1, etc. (replace all occurrences in order)
      let paramIndex = 0;
      processedQuery = processedQuery.replace(/\?/g, () => {
        const replacement = `@param${paramIndex}`;
        paramIndex++;
        return replacement;
      });
      
      if (callback) {
        request.query(processedQuery)
          .then(result => {
            callback(null, result.recordset || []);
          })
          .catch(callback);
      } else {
        return request.query(processedQuery)
          .then(result => result.recordset || []);
      }
    },

    // Execute a query (returns result object)
    query: (query, params = [], callback) => {
      const request = pool.request();
      
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
      
      let processedQuery = query;
      // Replace ? with @param0, @param1, etc. (replace all occurrences in order)
      let paramIndex = 0;
      processedQuery = processedQuery.replace(/\?/g, () => {
        const replacement = `@param${paramIndex}`;
        paramIndex++;
        return replacement;
      });
      
      if (callback) {
        request.query(processedQuery)
          .then(result => {
            callback(null, { rows: result.recordset, fields: result.columns });
          })
          .catch(callback);
      } else {
        return request.query(processedQuery)
          .then(result => ({ rows: result.recordset, fields: result.columns }));
      }
    }
  };
};

const close = async () => {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('SQL Server connection closed');
  }
};

module.exports = {
  init,
  getDb,
  close
};

