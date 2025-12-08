// SQL Server Database Configuration
const sql = require('mssql');

let pool = null;
let isConnecting = false;
let connectionPromise = null;

const init = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // Default encrypt to true for Azure SQL Database (required for cloud connections)
      const shouldEncrypt = process.env.MSSQL_ENCRYPT !== 'false';
      
      const config = {
        server: process.env.DB_HOST || process.env.MSSQL_SERVER || 'localhost\\SQLEXPRESS',
        port: parseInt(process.env.DB_PORT || process.env.MSSQL_PORT || '1433'),
        database: process.env.DB_NAME || process.env.MSSQL_DATABASE || 'audit_checklists',
        user: process.env.DB_USER || process.env.MSSQL_USER || 'sa',
        password: process.env.DB_PASSWORD || process.env.MSSQL_PASSWORD,
        options: {
          encrypt: shouldEncrypt,
          trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true' || !shouldEncrypt,
          enableArithAbort: true,
          connectionTimeout: 60000, // Increased for Azure cold starts
          requestTimeout: 60000
        },
        pool: {
          max: 10,
          min: 2, // Keep minimum connections alive to prevent cold start issues
          idleTimeoutMillis: 300000, // 5 minutes - keep connections alive longer for Azure
          acquireTimeoutMillis: 60000, // Increased timeout for acquiring a connection
          createTimeoutMillis: 60000,
          destroyTimeoutMillis: 5000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200
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

// Check if error is a connection-related error that should trigger reconnection
const isConnectionError = (error) => {
  if (!error) return false;
  const errorMessage = (error.message || '').toLowerCase();
  const errorCode = error.code || '';
  return (
    errorMessage.includes('connection') ||
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('socket') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('pool') ||
    errorCode === 'ESOCKET' ||
    errorCode === 'ECONNRESET' ||
    errorCode === 'ETIMEOUT' ||
    errorCode === 'ECONNCLOSED'
  );
};

// Force close existing pool before reconnection
const forceClosePool = async () => {
  if (pool) {
    try {
      await pool.close();
    } catch (e) {
      console.warn('Error closing pool:', e.message);
    }
    pool = null;
  }
};

// Ensure connection is ready (with retry logic for cold starts)
const ensureConnection = async (forceReconnect = false) => {
  // Check if pool is healthy
  if (!forceReconnect && pool && pool.connected && pool._connected) {
    return pool;
  }
  
  // If already connecting, wait for that to complete
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }
  
  console.log('Database pool not connected, attempting reconnection...');
  isConnecting = true;
  
  // Force close any stale connections
  await forceClosePool();
  
  connectionPromise = new Promise(async (resolve, reject) => {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const shouldEncrypt = process.env.MSSQL_ENCRYPT !== 'false';
        
        const config = {
          server: process.env.DB_HOST || process.env.MSSQL_SERVER || 'localhost\\SQLEXPRESS',
          port: parseInt(process.env.DB_PORT || process.env.MSSQL_PORT || '1433'),
          database: process.env.DB_NAME || process.env.MSSQL_DATABASE || 'audit_checklists',
          user: process.env.DB_USER || process.env.MSSQL_USER || 'sa',
          password: process.env.DB_PASSWORD || process.env.MSSQL_PASSWORD,
          options: {
            encrypt: shouldEncrypt,
            trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true' || !shouldEncrypt,
            enableArithAbort: true,
            connectionTimeout: 60000, // Increased for Azure cold starts
            requestTimeout: 60000
          },
          pool: {
            max: 10,
            min: 2,
            idleTimeoutMillis: 300000, // 5 minutes - keep connections alive longer
            acquireTimeoutMillis: 60000, // Increased timeout
            createTimeoutMillis: 60000,
            destroyTimeoutMillis: 5000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 200
          }
        };
        
        pool = await sql.connect(config);
        console.log(`Database reconnected successfully (attempt ${attempt})`);
        isConnecting = false;
        connectionPromise = null;
        resolve(pool);
        return;
      } catch (error) {
        lastError = error;
        console.error(`Database reconnection attempt ${attempt} failed:`, error.message);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
        }
      }
    }
    
    isConnecting = false;
    connectionPromise = null;
    reject(lastError);
  });
  
  return connectionPromise;
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
      FOREIGN KEY ([parent_id]) REFERENCES [locations]([id]) ON DELETE NO ACTION
    )`,
    
    // Teams table (must be created before audits table)
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
    )`,

    // App settings table (for admin-controlled feature flags)
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[app_settings]') AND type in (N'U'))
    CREATE TABLE [dbo].[app_settings] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [setting_key] NVARCHAR(100) UNIQUE NOT NULL,
      [setting_value] NTEXT NOT NULL,
      [description] NTEXT,
      [updated_at] DATETIME DEFAULT GETDATE(),
      [updated_by] INT,
      FOREIGN KEY ([updated_by]) REFERENCES [users]([id])
    )`,

    // Push tokens table (for push notifications)
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[push_tokens]') AND type in (N'U'))
    CREATE TABLE [dbo].[push_tokens] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [user_id] INT NOT NULL,
      [token] NVARCHAR(500) NOT NULL,
      [platform] NVARCHAR(50) DEFAULT 'unknown',
      [device_name] NVARCHAR(255) DEFAULT 'Unknown Device',
      [created_at] DATETIME DEFAULT GETDATE(),
      [updated_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([user_id]) REFERENCES [users]([id]) ON DELETE CASCADE
    )`,

    // Notification history table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[notification_history]') AND type in (N'U'))
    CREATE TABLE [dbo].[notification_history] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [user_id] INT NOT NULL,
      [title] NVARCHAR(255) NOT NULL,
      [body] NTEXT NOT NULL,
      [data] NTEXT,
      [read] BIT DEFAULT 0,
      [created_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([user_id]) REFERENCES [users]([id]) ON DELETE CASCADE
    )`,

    // Store Groups table
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[store_groups]') AND type in (N'U'))
    CREATE TABLE [dbo].[store_groups] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [name] NVARCHAR(255) NOT NULL,
      [code] NVARCHAR(50),
      [type] NVARCHAR(50) DEFAULT 'region',
      [description] NTEXT,
      [parent_group_id] INT,
      [color] NVARCHAR(20),
      [icon] NVARCHAR(50),
      [is_active] BIT DEFAULT 1,
      [sort_order] INT DEFAULT 0,
      [created_by] INT,
      [created_at] DATETIME DEFAULT GETDATE(),
      [updated_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([created_by]) REFERENCES [users]([id])
    )`,

    // Add group_id column to locations if not exists
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('locations') AND name = 'group_id')
    ALTER TABLE locations ADD group_id INT`,

    // Add brand column to locations if not exists
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('locations') AND name = 'brand')
    ALTER TABLE locations ADD brand NVARCHAR(100)`,

    // Add is_active column to locations if not exists
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('locations') AND name = 'is_active')
    ALTER TABLE locations ADD is_active BIT DEFAULT 1`,

    // Index on locations.group_id
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_locations_group')
    CREATE INDEX idx_locations_group ON locations(group_id)`,

    // Index on store_groups
    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_store_groups_parent')
    CREATE INDEX idx_store_groups_parent ON store_groups(parent_group_id)`,

    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_store_groups_type')
    CREATE INDEX idx_store_groups_type ON store_groups(type)`,

    // User-Location assignments table (which stores/outlets each user can access)
    `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[user_locations]') AND type in (N'U'))
    CREATE TABLE [dbo].[user_locations] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [user_id] INT NOT NULL,
      [location_id] INT NOT NULL,
      [access_type] NVARCHAR(50) DEFAULT 'assigned',
      [assigned_by] INT,
      [assigned_at] DATETIME DEFAULT GETDATE(),
      FOREIGN KEY ([user_id]) REFERENCES [users]([id]) ON DELETE CASCADE,
      FOREIGN KEY ([location_id]) REFERENCES [locations]([id]) ON DELETE CASCADE,
      FOREIGN KEY ([assigned_by]) REFERENCES [users]([id]),
      CONSTRAINT [UK_user_locations] UNIQUE ([user_id], [location_id])
    )`,

    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_user_locations_user')
    CREATE INDEX idx_user_locations_user ON user_locations(user_id)`,

    `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_user_locations_location')
    CREATE INDEX idx_user_locations_location ON user_locations(location_id)`
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
    // Fix locations parent_id foreign key constraint (SQL Server doesn't allow CASCADE on self-referencing FKs)
    try {
      // Find and drop any problematic FK constraints on parent_id that have CASCADE
      const fkResult = await pool.request().query(`
        SELECT fk.name AS constraint_name, fk.delete_referential_action_desc as delete_action
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        INNER JOIN sys.columns c ON fkc.parent_column_id = c.column_id AND fkc.parent_object_id = c.object_id
        WHERE OBJECT_NAME(fk.parent_object_id) = 'locations'
        AND c.name = 'parent_id'
      `);

      for (const row of fkResult.recordset) {
        if (row.delete_action !== 'NO_ACTION') {
          console.log(`Fixing locations parent_id FK constraint: ${row.constraint_name} (${row.delete_action} -> NO_ACTION)`);
          await pool.request().query(`ALTER TABLE [dbo].[locations] DROP CONSTRAINT [${row.constraint_name}]`);
          await pool.request().query(`
            ALTER TABLE [dbo].[locations]
            ADD CONSTRAINT [FK_locations_parent_id_fixed] 
            FOREIGN KEY ([parent_id]) REFERENCES [locations]([id]) ON DELETE NO ACTION
          `);
          console.log('Fixed locations parent_id FK constraint');
        }
      }
    } catch (fkError) {
      // Ignore errors - constraint might not exist or already fixed
      if (!fkError.message.includes('already exists')) {
        console.warn('Note: Could not check/fix locations FK:', fkError.message);
      }
    }

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
    
    // Add GPS coordinates to locations table for verification
    if (!locationColumns.includes('latitude')) {
      console.log('Adding latitude column to locations table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[locations] 
          ADD [latitude] DECIMAL(10, 8) NULL;
        `);
        console.log('latitude column added to locations table');
      } catch (err) {
        console.warn('Error adding latitude to locations:', err.message);
      }
    }
    
    if (!locationColumns.includes('longitude')) {
      console.log('Adding longitude column to locations table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[locations] 
          ADD [longitude] DECIMAL(11, 8) NULL;
        `);
        console.log('longitude column added to locations table');
      } catch (err) {
        console.warn('Error adding longitude to locations:', err.message);
      }
    }
    
    // Add region column to locations table
    if (!locationColumns.includes('region')) {
      console.log('Adding region column to locations table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[locations] 
          ADD [region] NVARCHAR(255) NULL;
        `);
        console.log('region column added to locations table');
      } catch (err) {
        console.warn('Error adding region to locations:', err.message);
      }
    }
    
    // Add district column to locations table
    if (!locationColumns.includes('district')) {
      console.log('Adding district column to locations table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[locations] 
          ADD [district] NVARCHAR(255) NULL;
        `);
        console.log('district column added to locations table');
      } catch (err) {
        console.warn('Error adding district to locations:', err.message);
      }
    }
    
    // Add parent_id column to locations table for hierarchy
    if (!locationColumns.includes('parent_id')) {
      console.log('Adding parent_id column to locations table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[locations] 
          ADD [parent_id] INT NULL;
        `);
        
        // Add self-referencing foreign key for hierarchy
        const constraintCheck = await pool.request().query(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
          WHERE TABLE_NAME = 'locations' AND CONSTRAINT_NAME = 'FK_locations_parent'
        `);
        
        if (constraintCheck.recordset[0].count === 0) {
          await pool.request().query(`
            ALTER TABLE [dbo].[locations]
            ADD CONSTRAINT [FK_locations_parent] 
            FOREIGN KEY ([parent_id]) REFERENCES [locations]([id]) ON DELETE NO ACTION;
          `);
        }
        console.log('parent_id column added to locations table');
      } catch (err) {
        console.warn('Error adding parent_id to locations:', err.message);
      }
    }
    
    // Add GPS location columns to audits table
    const checkAuditsGPS = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'audits'
    `);
    
    const auditsColumns = checkAuditsGPS.recordset.map(r => r.COLUMN_NAME);
    
    if (!auditsColumns.includes('gps_latitude')) {
      console.log('Adding GPS columns to audits table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[audits] 
          ADD [gps_latitude] DECIMAL(10, 8) NULL,
              [gps_longitude] DECIMAL(11, 8) NULL,
              [gps_accuracy] FLOAT NULL,
              [gps_timestamp] DATETIME NULL,
              [location_verified] BIT DEFAULT 0;
        `);
        console.log('GPS columns added to audits table');
      } catch (err) {
        console.warn('Error adding GPS columns to audits:', err.message);
      }
    }
    
    // Add weight and critical flag columns to checklist_items table
    const checkItemsCols = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'checklist_items'
    `);
    
    const itemsColumns = checkItemsCols.recordset.map(r => r.COLUMN_NAME);
    
    if (!itemsColumns.includes('weight')) {
      console.log('Adding weight column to checklist_items table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[checklist_items] 
          ADD [weight] INT DEFAULT 1;
        `);
        console.log('weight column added to checklist_items table');
      } catch (err) {
        console.warn('Error adding weight to checklist_items:', err.message);
      }
    }
    
    if (!itemsColumns.includes('is_critical')) {
      console.log('Adding is_critical column to checklist_items table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[checklist_items] 
          ADD [is_critical] BIT DEFAULT 0;
        `);
        console.log('is_critical column added to checklist_items table');
      } catch (err) {
        console.warn('Error adding is_critical to checklist_items:', err.message);
      }
    }
    
    // Add critical failure tracking to audits table
    if (!auditsColumns.includes('has_critical_failure')) {
      console.log('Adding has_critical_failure column to audits table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[audits] 
          ADD [has_critical_failure] BIT DEFAULT 0;
        `);
        console.log('has_critical_failure column added to audits table');
      } catch (err) {
        console.warn('Error adding has_critical_failure to audits:', err.message);
      }
    }
    
    if (!auditsColumns.includes('weighted_score')) {
      console.log('Adding weighted_score column to audits table...');
      try {
        await pool.request().query(`
          ALTER TABLE [dbo].[audits] 
          ADD [weighted_score] FLOAT NULL;
        `);
        console.log('weighted_score column added to audits table');
      } catch (err) {
        console.warn('Error adding weighted_score to audits:', err.message);
      }
    }
    
  } catch (error) {
    // Don't throw error for migration issues, just log them
    console.warn('Warning: Some column migrations may have failed:', error.message);
  }
};

// Database query methods (compatible with SQLite interface)
const getDb = () => {
  // Helper to prepare query and parameters
  const prepareQuery = (query, params, request) => {
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    
    let paramIndex = 0;
    return query.replace(/\?/g, () => {
      const replacement = `@param${paramIndex}`;
      paramIndex++;
      return replacement;
    });
  };
  
  return {
    // Run a query (for INSERT, UPDATE, DELETE)
    run: (query, params = [], callback) => {
      const executeRun = async (retryCount = 0) => {
        try {
          await ensureConnection();
          const request = pool.request();
          
          const isInsert = query.trim().toUpperCase().startsWith('INSERT');
          let processedQuery = prepareQuery(query, params, request);
          
          if (isInsert && !query.includes('OUTPUT') && !query.includes('SCOPE_IDENTITY')) {
            processedQuery = processedQuery + '; SELECT SCOPE_IDENTITY() AS id;';
          }
          
          const result = await request.query(processedQuery);
          let lastID = 0;
          if (isInsert && result.recordset && result.recordset.length > 0) {
            const idResult = result.recordset.find(r => r.id !== undefined);
            if (idResult) {
              lastID = parseInt(idResult.id) || 0;
            }
          }
          return { lastID, changes: result.rowsAffected[0] || 0 };
        } catch (error) {
          // Retry on connection errors (but not for write operations to avoid duplicates)
          if (isConnectionError(error) && retryCount < 2 && !query.trim().toUpperCase().startsWith('INSERT')) {
            console.log(`Query failed due to connection error, retrying (${retryCount + 1}/2)...`);
            await ensureConnection(true); // Force reconnect
            return executeRun(retryCount + 1);
          }
          throw error;
        }
      };
      
      if (callback) {
        executeRun().then(result => callback(null, result)).catch(callback);
      } else {
        return executeRun();
      }
    },

    // Get a single row
    get: (query, params = [], callback) => {
      const executeGet = async (retryCount = 0) => {
        try {
          await ensureConnection();
          const request = pool.request();
          const processedQuery = prepareQuery(query, params, request);
          const result = await request.query(processedQuery);
          return result.recordset[0] || null;
        } catch (error) {
          // Retry on connection errors
          if (isConnectionError(error) && retryCount < 2) {
            console.log(`Query failed due to connection error, retrying (${retryCount + 1}/2)...`);
            await ensureConnection(true); // Force reconnect
            return executeGet(retryCount + 1);
          }
          throw error;
        }
      };
      
      if (callback) {
        executeGet().then(result => callback(null, result)).catch(callback);
      } else {
        return executeGet();
      }
    },

    // Get all rows
    all: (query, params = [], callback) => {
      const executeAll = async (retryCount = 0) => {
        try {
          await ensureConnection();
          const request = pool.request();
          const processedQuery = prepareQuery(query, params, request);
          const result = await request.query(processedQuery);
          return result.recordset || [];
        } catch (error) {
          // Retry on connection errors
          if (isConnectionError(error) && retryCount < 2) {
            console.log(`Query failed due to connection error, retrying (${retryCount + 1}/2)...`);
            await ensureConnection(true); // Force reconnect
            return executeAll(retryCount + 1);
          }
          throw error;
        }
      };
      
      if (callback) {
        executeAll().then(result => callback(null, result)).catch(callback);
      } else {
        return executeAll();
      }
    },

    // Execute a query (returns result object)
    query: (query, params = [], callback) => {
      const executeQuery = async (retryCount = 0) => {
        try {
          await ensureConnection();
          const request = pool.request();
          const processedQuery = prepareQuery(query, params, request);
          const result = await request.query(processedQuery);
          return { rows: result.recordset, fields: result.columns };
        } catch (error) {
          // Retry on connection errors
          if (isConnectionError(error) && retryCount < 2) {
            console.log(`Query failed due to connection error, retrying (${retryCount + 1}/2)...`);
            await ensureConnection(true); // Force reconnect
            return executeQuery(retryCount + 1);
          }
          throw error;
        }
      };
      
      if (callback) {
        executeQuery().then(result => callback(null, result)).catch(callback);
      } else {
        return executeQuery();
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

