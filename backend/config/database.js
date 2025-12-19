const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../data/audit.db');

let db = null;

const init = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
      db.serialize(() => {
      // Roles table (must be created before users table)
      db.run(`CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        is_system_role BOOLEAN DEFAULT 0,
        permissions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Checklist Templates table
      db.run(`CREATE TABLE IF NOT EXISTS checklist_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`);

      // Checklist Items table
      db.run(`CREATE TABLE IF NOT EXISTS checklist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        required BOOLEAN DEFAULT 1,
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
      )`);

      // Checklist Item Options table (for marking system)
      db.run(`CREATE TABLE IF NOT EXISTS checklist_item_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        option_text TEXT NOT NULL,
        mark TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE CASCADE
      )`);

      // Locations table (must be created before audits table)
      db.run(`CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_number TEXT,
        name TEXT NOT NULL,
        address TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        phone TEXT,
        email TEXT,
        parent_id INTEGER,
        region TEXT,
        district TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE SET NULL
      )`);
      
      // Add hierarchy columns if they don't exist (migration)
      db.run(`ALTER TABLE locations ADD COLUMN parent_id INTEGER`, () => {});
      db.run(`ALTER TABLE locations ADD COLUMN region TEXT`, () => {});
      db.run(`ALTER TABLE locations ADD COLUMN district TEXT`, () => {});
      
      // Add weight and critical flag columns to checklist_items (migration)
      db.run(`ALTER TABLE checklist_items ADD COLUMN weight INTEGER DEFAULT 1`, () => {});
      db.run(`ALTER TABLE checklist_items ADD COLUMN is_critical BOOLEAN DEFAULT 0`, () => {});
      
      // Add time-based scoring columns to checklist_items (migration for Item Making Performance)
      db.run(`ALTER TABLE checklist_items ADD COLUMN is_time_based BOOLEAN DEFAULT 0`, () => {});
      db.run(`ALTER TABLE checklist_items ADD COLUMN target_time_minutes REAL`, () => {});
      db.run(`ALTER TABLE checklist_items ADD COLUMN time_tolerance_percent INTEGER DEFAULT 20`, () => {});
      
      // Add critical failure tracking to audits (migration)
      db.run(`ALTER TABLE audits ADD COLUMN has_critical_failure BOOLEAN DEFAULT 0`, () => {});
      db.run(`ALTER TABLE audits ADD COLUMN weighted_score REAL`, () => {});

      // Audits table
      db.run(`CREATE TABLE IF NOT EXISTS audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        restaurant_name TEXT NOT NULL,
        location TEXT,
        location_id INTEGER,
        team_id INTEGER,
        scheduled_audit_id INTEGER,
        status TEXT DEFAULT 'in_progress',
        score INTEGER,
        total_items INTEGER,
        completed_items INTEGER DEFAULT 0,
        notes TEXT,
        is_mystery_shopper BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (location_id) REFERENCES locations(id)
      )`);

      // Audit Items (responses) table
      db.run(`CREATE TABLE IF NOT EXISTS audit_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        selected_option_id INTEGER,
        mark TEXT,
        comment TEXT,
        photo_url TEXT,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES checklist_items(id),
        FOREIGN KEY (selected_option_id) REFERENCES checklist_item_options(id)
      )`);

      // Action Items table
      db.run(`CREATE TABLE IF NOT EXISTS action_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_id INTEGER NOT NULL,
        item_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        assigned_to INTEGER,
        due_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES checklist_items(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id)
      )`);

      // Scheduled Audits table
      db.run(`CREATE TABLE IF NOT EXISTS scheduled_audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        location_id INTEGER,
        assigned_to INTEGER,
        scheduled_date DATE NOT NULL,
        frequency TEXT DEFAULT 'once',
        next_run_date DATE,
        status TEXT DEFAULT 'pending',
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
        FOREIGN KEY (location_id) REFERENCES locations(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`);

      // Reschedule Tracking table (tracks reschedules per user per month)
      db.run(`CREATE TABLE IF NOT EXISTS reschedule_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheduled_audit_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        old_date DATE NOT NULL,
        new_date DATE NOT NULL,
        reschedule_month TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scheduled_audit_id) REFERENCES scheduled_audits(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);
      
      // Add reschedule_tracking columns if they don't exist (migration)
      db.run(`ALTER TABLE reschedule_tracking ADD COLUMN reschedule_month TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.log('Note: reschedule_month column may already exist');
        }
      });

      // Tasks table (for workflow management)
      db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'general',
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        assigned_to INTEGER,
        created_by INTEGER NOT NULL,
        team_id INTEGER,
        action_item_id INTEGER,
        due_date DATETIME,
        reminder_date DATETIME,
        completed_at DATETIME,
        workflow_id INTEGER,
        depends_on_task_id INTEGER,
        location_id INTEGER,
        audit_id INTEGER,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (action_item_id) REFERENCES action_items(id) ON DELETE SET NULL,
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
        FOREIGN KEY (location_id) REFERENCES locations(id),
        FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE SET NULL
      )`);

      // Task Dependencies table (for complex dependency chains)
      db.run(`CREATE TABLE IF NOT EXISTS task_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        depends_on_task_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        UNIQUE(task_id, depends_on_task_id)
      )`);

      // Teams table (for team/department management)
      db.run(`CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        team_lead_id INTEGER,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_lead_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`);

      // Team Members junction table
      db.run(`CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(team_id, user_id)
      )`);

      // Notifications table
      db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      // Push notification tokens table
      db.run(`CREATE TABLE IF NOT EXISTS push_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        platform TEXT DEFAULT 'unknown',
        device_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      // Notification history table (for sent push notifications)
      db.run(`CREATE TABLE IF NOT EXISTS notification_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        data TEXT,
        read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      // Digital signatures table
      db.run(`CREATE TABLE IF NOT EXISTS audit_signatures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_id INTEGER NOT NULL,
        signer_name TEXT NOT NULL,
        signer_role TEXT,
        signature_data TEXT NOT NULL,
        signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        device_info TEXT,
        FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
      )`);

      // App settings table (for admin-controlled feature flags)
      db.run(`CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER,
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )`);

      // Core audit indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_audits_user ON audits(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audits_template ON audits(template_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audits_location ON audits(location_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audits_scheduled ON audits(scheduled_audit_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audit_items_audit ON audit_items(audit_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audit_items_item ON audit_items(item_id)`);
      
      // Checklist indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_checklist_items_template ON checklist_items(template_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_checklist_items_category ON checklist_items(category)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_checklist_item_options_item ON checklist_item_options(item_id)`);
      
      // Scheduled audit indexes (critical for performance)
      db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_audits_date ON scheduled_audits(scheduled_date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_audits_status ON scheduled_audits(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_audits_assigned ON scheduled_audits(assigned_to)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_audits_template ON scheduled_audits(template_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_audits_location ON scheduled_audits(location_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_audits_created_by ON scheduled_audits(created_by)`);
      
      // Reschedule tracking indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_reschedule_tracking_user ON reschedule_tracking(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_reschedule_tracking_month ON reschedule_tracking(reschedule_month)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_reschedule_tracking_audit ON reschedule_tracking(scheduled_audit_id)`);
      
      // Location indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_locations_store_number ON locations(store_number)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_locations_region ON locations(region)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_locations_district ON locations(district)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id)`);
      
      // Action items indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_action_items_audit ON action_items(audit_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_action_items_assigned ON action_items(assigned_to)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_action_items_due_date ON action_items(due_date)`);
      
      // Task indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_workflow ON tasks(workflow_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks(location_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_audit ON tasks(audit_id)`);
      
      // Team indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_teams_lead ON teams(team_lead_id)`);
      
      // Notification indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)`);

      // Push token indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token)`);

      // Notification history indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_notification_history_read ON notification_history(read)`);

      // Signature indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_audit_signatures_audit ON audit_signatures(audit_id)`);

      // User preferences table
      db.run(`CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        email_notifications_enabled BOOLEAN DEFAULT 1,
        email_audit_completed BOOLEAN DEFAULT 1,
        email_action_assigned BOOLEAN DEFAULT 1,
        email_task_reminder BOOLEAN DEFAULT 1,
        email_overdue_items BOOLEAN DEFAULT 1,
        email_scheduled_audit BOOLEAN DEFAULT 1,
        date_format TEXT DEFAULT 'DD-MM-YYYY',
        items_per_page INTEGER DEFAULT 25,
        theme TEXT DEFAULT 'light',
        dashboard_default_view TEXT DEFAULT 'cards',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id)`);
      
      // Add columns to existing audit_items table if they don't exist
      db.all(`PRAGMA table_info(audit_items)`, (err, columns) => {
        if (!err && columns) {
          const columnNames = columns.map(col => col.name);
          if (!columnNames.includes('selected_option_id')) {
            db.run(`ALTER TABLE audit_items ADD COLUMN selected_option_id INTEGER`, (alterErr) => {
              if (alterErr) console.error('Error adding selected_option_id column:', alterErr);
            });
          }
          if (!columnNames.includes('mark')) {
            db.run(`ALTER TABLE audit_items ADD COLUMN mark TEXT`, (alterErr) => {
              if (alterErr) console.error('Error adding mark column:', alterErr);
            });
          }
          // Add time tracking columns for Item Making Performance
          if (!columnNames.includes('time_taken_minutes')) {
            db.run(`ALTER TABLE audit_items ADD COLUMN time_taken_minutes REAL`, (alterErr) => {
              if (alterErr) console.error('Error adding time_taken_minutes column:', alterErr);
            });
          }
          if (!columnNames.includes('started_at')) {
            db.run(`ALTER TABLE audit_items ADD COLUMN started_at DATETIME`, (alterErr) => {
              if (alterErr) console.error('Error adding started_at column:', alterErr);
            });
          }
          // Add multi-time entries for Item Making Performance (stores JSON array of times)
          if (!columnNames.includes('time_entries')) {
            db.run(`ALTER TABLE audit_items ADD COLUMN time_entries TEXT`, (alterErr) => {
              if (alterErr) console.error('Error adding time_entries column:', alterErr);
            });
          }
          // Add average time from multiple entries
          if (!columnNames.includes('average_time_minutes')) {
            db.run(`ALTER TABLE audit_items ADD COLUMN average_time_minutes REAL`, (alterErr) => {
              if (alterErr) console.error('Error adding average_time_minutes column:', alterErr);
            });
          }
        }
      });

      // Ensure audits table has scheduled_audit_id column for linking scheduled audits
      db.all(`PRAGMA table_info(audits)`, (err, columns) => {
        if (!err && columns) {
          const columnNames = columns.map(col => col.name);
          if (!columnNames.includes('scheduled_audit_id')) {
            db.run(`ALTER TABLE audits ADD COLUMN scheduled_audit_id INTEGER`, (alterErr) => {
              if (alterErr) console.error('Error adding scheduled_audit_id column:', alterErr);
            });
          }
          // Add GPS location columns to audits table
          if (!columnNames.includes('gps_latitude')) {
            db.run(`ALTER TABLE audits ADD COLUMN gps_latitude REAL`, () => {});
          }
          if (!columnNames.includes('gps_longitude')) {
            db.run(`ALTER TABLE audits ADD COLUMN gps_longitude REAL`, () => {});
          }
          if (!columnNames.includes('gps_accuracy')) {
            db.run(`ALTER TABLE audits ADD COLUMN gps_accuracy REAL`, () => {});
          }
          if (!columnNames.includes('gps_timestamp')) {
            db.run(`ALTER TABLE audits ADD COLUMN gps_timestamp DATETIME`, () => {});
          }
          if (!columnNames.includes('location_verified')) {
            db.run(`ALTER TABLE audits ADD COLUMN location_verified BOOLEAN DEFAULT 0`, () => {});
          }
        }
      });

      // Add GPS coordinates to locations table for verification
      db.all(`PRAGMA table_info(locations)`, (err, columns) => {
        if (!err && columns) {
          const columnNames = columns.map(col => col.name);
          if (!columnNames.includes('latitude')) {
            db.run(`ALTER TABLE locations ADD COLUMN latitude REAL`, () => {});
          }
          if (!columnNames.includes('longitude')) {
            db.run(`ALTER TABLE locations ADD COLUMN longitude REAL`, () => {});
          }
          if (!columnNames.includes('group_id')) {
            db.run(`ALTER TABLE locations ADD COLUMN group_id INTEGER`, () => {});
          }
          if (!columnNames.includes('brand')) {
            db.run(`ALTER TABLE locations ADD COLUMN brand TEXT`, () => {});
          }
          if (!columnNames.includes('is_active')) {
            db.run(`ALTER TABLE locations ADD COLUMN is_active INTEGER DEFAULT 1`, () => {});
          }
        }
      });

      // Create store_groups table if it doesn't exist
      db.run(`CREATE TABLE IF NOT EXISTS store_groups (
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
      )`);

      // User-Location assignments table (which stores/outlets each user can access)
      db.run(`CREATE TABLE IF NOT EXISTS user_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        access_type TEXT DEFAULT 'assigned',
        assigned_by INTEGER,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id),
        UNIQUE(user_id, location_id)
      )`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_locations_location ON user_locations(location_id)`);
      
      // User-Checklist Permissions table (for checklist-wise permissions)
      db.run(`CREATE TABLE IF NOT EXISTS user_checklist_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        template_id INTEGER NOT NULL,
        can_start_audit BOOLEAN DEFAULT 1,
        assigned_by INTEGER,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id),
        UNIQUE(user_id, template_id)
      )`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_checklist_permissions_user ON user_checklist_permissions(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_checklist_permissions_template ON user_checklist_permissions(template_id)`);
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_locations_group ON locations(group_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_store_groups_parent ON store_groups(parent_group_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_store_groups_type ON store_groups(type)`);

      // Check if roles table exists, if not create it (for existing databases)
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='roles'", (err, row) => {
        if (err) {
          console.error('Error checking roles table:', err);
          reject(err);
          return;
        }
        
        if (!row) {
          console.log('Roles table not found, creating it...');
          db.run(`CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            description TEXT,
            is_system_role BOOLEAN DEFAULT 0,
            permissions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
            if (err) {
              console.error('Error creating roles table:', err);
              reject(err);
              return;
            }
            console.log('Roles table created successfully');
            seedDefaultRoles();
            seedDefaultTemplates();
            seedDefaultUser();
            resolve();
          });
        } else {
          db.run('SELECT 1', (err) => {
            if (err) reject(err);
            else {
              console.log('Database tables created successfully');
              seedDefaultRoles();
              seedDefaultTemplates();
              seedDefaultUser();
              resolve();
            }
          });
        }
      });
    });
  });
};

const seedDefaultRoles = () => {
  db.get('SELECT COUNT(*) as count FROM roles', (err, row) => {
    if (err) return;
    if (row.count > 0) return; // Already seeded

    const defaultRoles = [
      { 
        name: 'admin', 
        display_name: 'Administrator', 
        description: 'Full system access. Can manage users, roles, audits, and all settings.',
        is_system_role: 1,
        permissions: JSON.stringify(['*'])
      },
      { 
        name: 'manager', 
        display_name: 'Manager', 
        description: 'Can manage audits, locations, templates, and view all reports. Cannot manage users or roles.',
        is_system_role: 1,
        permissions: JSON.stringify([
          // Audit Management
          'manage_audits', 'view_audits', 'create_audits', 'edit_audits',
          // Scheduled Audits
          'manage_scheduled_audits', 'view_scheduled_audits', 'create_scheduled_audits', 'update_scheduled_audits', 'start_scheduled_audits', 'reschedule_scheduled_audits',
          // Templates
          'manage_templates', 'display_templates', 'view_templates', 'create_templates', 'edit_templates', 'delete_templates',
          // Locations
          'manage_locations', 'view_locations', 'create_locations', 'edit_locations',
          // Actions & Tasks
          'manage_actions', 'view_actions', 'create_actions', 'update_actions',
          'manage_tasks', 'view_tasks', 'create_tasks', 'update_tasks',
          // Analytics & Reports
          'view_analytics', 'view_store_analytics', 'view_location_verification', 'view_monthly_scorecard', 'export_data',
          // View Users (for assignment)
          'view_users'
        ])
      },
      { 
        name: 'supervisor', 
        display_name: 'Supervisor', 
        description: 'Can view team audits, manage scheduled audits for team, and view reports.',
        is_system_role: 1,
        permissions: JSON.stringify([
          // Audits
          'view_audits', 'create_audits',
          // Scheduled Audits
          'view_scheduled_audits', 'create_scheduled_audits', 'update_scheduled_audits', 'start_scheduled_audits', 'reschedule_scheduled_audits',
          // Templates (read-only)
          'display_templates', 'view_templates',
          // Locations
          'view_locations',
          // Actions & Tasks
          'view_actions', 'create_actions', 'update_actions',
          'view_tasks', 'create_tasks', 'update_tasks',
          // Analytics
          'view_analytics', 'view_store_analytics', 'view_location_verification',
          // View Users (for assignment)
          'view_users'
        ])
      },
      { 
        name: 'auditor', 
        display_name: 'Auditor', 
        description: 'Can create and complete audits, manage action items. View own data only.',
        is_system_role: 1,
        permissions: JSON.stringify([
          // Audits
          'create_audits', 'view_own_audits',
          // Scheduled Audits
          'view_scheduled_audits', 'start_scheduled_audits', 'reschedule_scheduled_audits',
          // Templates (read-only)
          'display_templates', 'view_templates',
          // Locations
          'view_locations',
          // Actions & Tasks
          'view_actions', 'create_actions', 'update_actions',
          'view_tasks', 'create_tasks', 'update_tasks'
        ])
      },
      { 
        name: 'user', 
        display_name: 'User', 
        description: 'Basic access. Can view own audits, start scheduled audits, and manage own action items.',
        is_system_role: 1,
        permissions: JSON.stringify([
          // Audits
          'view_own_audits',
          // Scheduled Audits
          'view_scheduled_audits', 'start_scheduled_audits', 'reschedule_scheduled_audits',
          // Templates (read-only)
          'display_templates',
          // Locations
          'view_locations',
          // Actions & Tasks (own only)
          'view_actions', 'create_actions',
          'view_tasks', 'update_tasks'
        ])
      }
    ];

    defaultRoles.forEach((role) => {
      db.run(
        'INSERT INTO roles (name, display_name, description, is_system_role, permissions) VALUES (?, ?, ?, ?, ?)',
        [role.name, role.display_name, role.description, role.is_system_role ? 1 : 0, role.permissions],
        function(err) {
          if (err) {
            console.error(`Error creating default role ${role.name}:`, err);
          } else {
            console.log(`Default role ${role.name} created successfully`);
          }
        }
      );
    });
  });
};

const seedDefaultTemplates = () => {
  db.get('SELECT COUNT(*) as count FROM checklist_templates', (err, row) => {
    if (err) return;
    if (row.count > 0) return; // Already seeded

    // Insert default restaurant audit template
    db.run(`INSERT INTO checklist_templates (name, category, description) 
            VALUES (?, ?, ?)`, 
            ['Restaurant Safety & Compliance', 'Safety', 'Comprehensive restaurant audit checklist'], 
            function(err) {
      if (err) return;
      const templateId = this.lastID;

      const defaultItems = [
        // Food Safety
        { title: 'Food Storage Temperature', description: 'Check refrigerators and freezers are at correct temperatures', category: 'Food Safety', required: true },
        { title: 'Food Expiration Dates', description: 'Verify all food items are within expiration dates', category: 'Food Safety', required: true },
        { title: 'Cross-Contamination Prevention', description: 'Ensure proper separation of raw and cooked foods', category: 'Food Safety', required: true },
        { title: 'Hand Washing Stations', description: 'Verify hand washing stations are functional and stocked', category: 'Food Safety', required: true },
        
        // Cleanliness
        { title: 'Kitchen Cleanliness', description: 'Kitchen surfaces, equipment, and floors are clean', category: 'Cleanliness', required: true },
        { title: 'Dining Area Cleanliness', description: 'Tables, chairs, and floors are clean', category: 'Cleanliness', required: true },
        { title: 'Restroom Cleanliness', description: 'Restrooms are clean and well-maintained', category: 'Cleanliness', required: true },
        { title: 'Waste Management', description: 'Proper waste disposal and trash containers', category: 'Cleanliness', required: true },
        
        // Equipment
        { title: 'Cooking Equipment', description: 'All cooking equipment is functional and clean', category: 'Equipment', required: true },
        { title: 'Refrigeration Units', description: 'Refrigerators and freezers are working properly', category: 'Equipment', required: true },
        { title: 'Fire Safety Equipment', description: 'Fire extinguishers and alarms are in place and functional', category: 'Equipment', required: true },
        { title: 'Ventilation System', description: 'Kitchen ventilation is working properly', category: 'Equipment', required: false },
        
        // Staff
        { title: 'Staff Hygiene', description: 'Staff follow proper hygiene practices', category: 'Staff', required: true },
        { title: 'Staff Training Records', description: 'Food safety training records are up to date', category: 'Staff', required: true },
        { title: 'Uniform and Appearance', description: 'Staff uniforms are clean and appropriate', category: 'Staff', required: false },
        
        // Compliance
        { title: 'Health Permit', description: 'Current health permit is displayed', category: 'Compliance', required: true },
        { title: 'Insurance Documentation', description: 'Insurance documents are current', category: 'Compliance', required: true },
        { title: 'Employee Certifications', description: 'Required certifications are current', category: 'Compliance', required: true }
      ];

      defaultItems.forEach((item, index) => {
        db.run(`INSERT INTO checklist_items (template_id, title, description, category, required, order_index) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [templateId, item.title, item.description, item.category, item.required ? 1 : 0, index]);
      });
    });
  });
};

const seedDefaultUser = async () => {
  db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
    if (err) return;
    if (row.count > 0) return; // Already seeded

    // Create default test users
    const defaultUsers = [
      { email: 'admin@test.com', password: 'admin123', name: 'Admin User', role: 'admin' },
      { email: 'admin@example.com', password: 'admin123', name: 'Admin User', role: 'admin' }
    ];
    
    try {
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      db.run(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [defaultEmail, hashedPassword, defaultName, 'admin'],
        function(err) {
          if (err) {
            console.error('Error creating default user:', err);
          } else {
            console.log('Default user created successfully');
            console.log('Email:', defaultEmail);
            console.log('Password:', defaultPassword);
          }
        }
      );
    } catch (error) {
      console.error('Error hashing password for default user:', error);
    }
  });
};

const getDb = () => db;

const close = () => {
  if (db) {
    db.close((err) => {
      if (err) console.error('Error closing database:', err);
      else console.log('Database connection closed');
    });
  }
};

module.exports = {
  init,
  getDb,
  close
};

