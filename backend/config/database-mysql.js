// MySQL Database Configuration
const mysql = require('mysql2/promise');

let pool = null;

const init = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const config = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'audit_checklists',
        charset: 'utf8mb4',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      };

      pool = mysql.createPool(config);

      // Test connection
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      
      console.log('Connected to MySQL database');
      await createTables();
      resolve();
    } catch (error) {
      console.error('MySQL initialization error:', error);
      reject(error);
    }
  });
};

const createTables = async () => {
  const queries = [
    // Roles table
    `CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      description TEXT,
      is_system_role BOOLEAN DEFAULT FALSE,
      permissions TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Checklist Templates table
    `CREATE TABLE IF NOT EXISTS checklist_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      description TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Checklist Items table
    `CREATE TABLE IF NOT EXISTS checklist_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      template_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(255),
      required BOOLEAN DEFAULT TRUE,
      order_index INT DEFAULT 0,
      input_type VARCHAR(50) DEFAULT 'auto',
      FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Checklist Item Options table (for marking system)
    `CREATE TABLE IF NOT EXISTS checklist_item_options (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_id INT NOT NULL,
      option_text VARCHAR(255) NOT NULL,
      mark VARCHAR(10) NOT NULL,
      order_index INT DEFAULT 0,
      FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Locations table
    `CREATE TABLE IF NOT EXISTS locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      store_number VARCHAR(50),
      name VARCHAR(255) NOT NULL,
      address TEXT,
      city VARCHAR(255),
      state VARCHAR(255),
      country VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      parent_id INT,
      region VARCHAR(255),
      district VARCHAR(255),
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Audits table
    `CREATE TABLE IF NOT EXISTS audits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      template_id INT NOT NULL,
      user_id INT NOT NULL,
      restaurant_name VARCHAR(255) NOT NULL,
      location TEXT,
      location_id INT,
      team_id INT,
      scheduled_audit_id INT,
      status VARCHAR(50) DEFAULT 'in_progress',
      score INT,
      total_items INT,
      completed_items INT DEFAULT 0,
      notes TEXT,
      is_mystery_shopper BOOLEAN DEFAULT FALSE,
      client_audit_uuid VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (location_id) REFERENCES locations(id),
      UNIQUE KEY uniq_audits_client_uuid (client_audit_uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Audit Items table
    `CREATE TABLE IF NOT EXISTS audit_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      audit_id INT NOT NULL,
      item_id INT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      selected_option_id INT,
      mark VARCHAR(10),
      comment TEXT,
      photo_url TEXT,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES checklist_items(id),
      FOREIGN KEY (selected_option_id) REFERENCES checklist_item_options(id),
      UNIQUE KEY uniq_audit_items (audit_id, item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Action Items table
    `CREATE TABLE IF NOT EXISTS action_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      audit_id INT NOT NULL,
      item_id INT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(50) DEFAULT 'medium',
      status VARCHAR(50) DEFAULT 'pending',
      assigned_to INT,
      due_date TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      escalated TINYINT(1) DEFAULT 0,
      escalated_to INT,
      escalated_at TIMESTAMP NULL,
      FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES checklist_items(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (escalated_to) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Action Plan table (auto-generated Top-3 deviations)
    `CREATE TABLE IF NOT EXISTS action_plan (
      id INT AUTO_INCREMENT PRIMARY KEY,
      audit_id INT NOT NULL,
      item_id INT,
      checklist_category VARCHAR(255),
      checklist_question VARCHAR(500),
      deviation_reason TEXT,
      severity VARCHAR(50) DEFAULT 'MINOR',
      root_cause TEXT,
      corrective_action TEXT,
      preventive_action TEXT,
      owner_role VARCHAR(100),
      responsible_person VARCHAR(255),
      responsible_person_id INT,
      target_date DATE,
      status VARCHAR(50) DEFAULT 'OPEN',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES checklist_items(id),
      FOREIGN KEY (responsible_person_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE INDEX IF NOT EXISTS idx_action_plan_audit ON action_plan(audit_id)`,
    `CREATE INDEX IF NOT EXISTS idx_action_plan_status ON action_plan(status)`,
    
    // Add action_plan columns if they don't exist (for existing databases)
    `ALTER TABLE action_plan ADD COLUMN IF NOT EXISTS root_cause TEXT`,
    `ALTER TABLE action_plan ADD COLUMN IF NOT EXISTS preventive_action TEXT`,
    `ALTER TABLE action_plan ADD COLUMN IF NOT EXISTS owner_role VARCHAR(100)`,
    
    // Add escalation columns if they don't exist (for existing databases)
    `ALTER TABLE action_items ADD COLUMN IF NOT EXISTS escalated TINYINT(1) DEFAULT 0`,
    `ALTER TABLE action_items ADD COLUMN IF NOT EXISTS escalated_to INT`,
    `ALTER TABLE action_items ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP NULL`,
    
    // Action Comments table for escalation history tracking
    `CREATE TABLE IF NOT EXISTS action_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      action_id INT NOT NULL,
      user_id INT NOT NULL,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (action_id) REFERENCES action_items(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    `CREATE INDEX IF NOT EXISTS idx_action_comments_action ON action_comments(action_id)`,
    `CREATE INDEX IF NOT EXISTS idx_action_comments_user ON action_comments(user_id)`,
    
    // Assignment Rules table (for category-based assignment rules)
    `CREATE TABLE IF NOT EXISTS assignment_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category VARCHAR(255) NOT NULL,
      assigned_role VARCHAR(50) NOT NULL,
      template_id INT,
      priority_level INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    `CREATE INDEX IF NOT EXISTS idx_assignment_rules_category ON assignment_rules(category)`,
    `CREATE INDEX IF NOT EXISTS idx_assignment_rules_template ON assignment_rules(template_id)`,
    `CREATE INDEX IF NOT EXISTS idx_assignment_rules_active ON assignment_rules(is_active)`,
    
    // Escalation Paths table (for multi-level escalation configuration)
    `CREATE TABLE IF NOT EXISTS escalation_paths (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      level INT NOT NULL,
      role VARCHAR(50) NOT NULL,
      days_before_escalation INT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    `CREATE INDEX IF NOT EXISTS idx_escalation_paths_name ON escalation_paths(name)`,
    `CREATE INDEX IF NOT EXISTS idx_escalation_paths_level ON escalation_paths(level)`,
    `CREATE INDEX IF NOT EXISTS idx_escalation_paths_active ON escalation_paths(is_active)`,
    
    // Add escalation_level to action_items if it doesn't exist
    `ALTER TABLE action_items ADD COLUMN escalation_level INT DEFAULT 0`,
    
    // Scheduled Audits table
    `CREATE TABLE IF NOT EXISTS scheduled_audits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      template_id INT NOT NULL,
      location_id INT,
      assigned_to INT,
      scheduled_date DATE NOT NULL,
      frequency VARCHAR(50) DEFAULT 'once',
      next_run_date DATE,
      status VARCHAR(50) DEFAULT 'pending',
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Reschedule Tracking table
    `CREATE TABLE IF NOT EXISTS reschedule_tracking (
      id INT AUTO_INCREMENT PRIMARY KEY,
      scheduled_audit_id INT NOT NULL,
      user_id INT NOT NULL,
      old_date DATE NOT NULL,
      new_date DATE NOT NULL,
      reschedule_month VARCHAR(7) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scheduled_audit_id) REFERENCES scheduled_audits(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    `ALTER TABLE audits ADD COLUMN IF NOT EXISTS scheduled_audit_id INT NULL`,
    
    // Tasks table (for workflow management)
    `CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(50) DEFAULT 'general',
      status VARCHAR(50) DEFAULT 'pending',
      priority VARCHAR(50) DEFAULT 'medium',
      assigned_to INT,
      created_by INT NOT NULL,
      team_id INT,
      action_item_id INT,
      due_date DATETIME,
      reminder_date DATETIME,
      completed_at DATETIME,
      workflow_id INT,
      depends_on_task_id INT,
      location_id INT,
      audit_id INT,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (action_item_id) REFERENCES action_items(id) ON DELETE SET NULL,
      FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Task Dependencies table (for complex dependency chains)
    `CREATE TABLE IF NOT EXISTS task_dependencies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      depends_on_task_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE KEY unique_dependency (task_id, depends_on_task_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Teams table (for team/department management)
    `CREATE TABLE IF NOT EXISTS teams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      team_lead_id INT,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_lead_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Team Members junction table
    `CREATE TABLE IF NOT EXISTS team_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_id INT NOT NULL,
      user_id INT NOT NULL,
      role VARCHAR(50) DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_team_member (team_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // Notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    
    // User preferences table
    `CREATE TABLE IF NOT EXISTS user_preferences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      email_notifications_enabled BOOLEAN DEFAULT TRUE,
      email_audit_completed BOOLEAN DEFAULT TRUE,
      email_action_assigned BOOLEAN DEFAULT TRUE,
      email_task_reminder BOOLEAN DEFAULT TRUE,
      email_overdue_items BOOLEAN DEFAULT TRUE,
      email_scheduled_audit BOOLEAN DEFAULT TRUE,
      date_format VARCHAR(20) DEFAULT 'DD-MM-YYYY',
      items_per_page INT DEFAULT 25,
      theme VARCHAR(20) DEFAULT 'light',
      dashboard_default_view VARCHAR(20) DEFAULT 'cards',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  ];

  try {
    for (const query of queries) {
      await pool.execute(query);
    }
    console.log('MySQL tables created/verified');
  } catch (error) {
    console.error('Error creating MySQL tables:', error);
    throw error;
  }
};

// Database query methods (compatible with SQLite interface)
const getDb = () => {
  return {
    // Run a query (for INSERT, UPDATE, DELETE)
    run: (query, params = [], callback) => {
      if (callback) {
        // Callback style (for compatibility)
        pool.execute(query, params)
          .then(([result]) => {
            callback(null, {
              lastID: result.insertId,
              changes: result.affectedRows
            });
          })
          .catch(callback);
      } else {
        // Promise style
        return pool.execute(query, params)
          .then(([result]) => ({
            lastID: result.insertId,
            changes: result.affectedRows
          }));
      }
    },

    // Get a single row
    get: (query, params = [], callback) => {
      if (callback) {
        pool.execute(query, params)
          .then(([rows]) => {
            callback(null, rows[0] || null);
          })
          .catch(callback);
      } else {
        return pool.execute(query, params)
          .then(([rows]) => rows[0] || null);
      }
    },

    // Get all rows
    all: (query, params = [], callback) => {
      if (callback) {
        pool.execute(query, params)
          .then(([rows]) => {
            callback(null, rows);
          })
          .catch(callback);
      } else {
        return pool.execute(query, params)
          .then(([rows]) => rows);
      }
    },

    // Execute a query (returns result object)
    query: (query, params = [], callback) => {
      if (callback) {
        pool.execute(query, params)
          .then(([rows, fields]) => {
            callback(null, rows, fields);
          })
          .catch(callback);
      } else {
        return pool.execute(query, params)
          .then(([rows, fields]) => ({ rows, fields }));
      }
    }
  };
};

const close = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('MySQL connection pool closed');
  }
};

module.exports = {
  init,
  getDb,
  close
};

