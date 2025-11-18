// PostgreSQL Database Configuration
const { Pool } = require('pg');

let pool = null;

const init = () => {
  return new Promise((resolve, reject) => {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      
      if (!databaseUrl) {
        return reject(new Error('DATABASE_URL environment variable is required for PostgreSQL'));
      }

      pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });

      // Test connection
      pool.query('SELECT NOW()', (err, res) => {
        if (err) {
          console.error('Error connecting to PostgreSQL:', err);
          return reject(err);
        }
        console.log('Connected to PostgreSQL database');
        createTables().then(resolve).catch(reject);
      });
    } catch (error) {
      console.error('PostgreSQL initialization error:', error);
      reject(error);
    }
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    const queries = [
      // Roles table
      `CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        is_system_role BOOLEAN DEFAULT FALSE,
        permissions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Checklist Templates table
      `CREATE TABLE IF NOT EXISTS checklist_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`,
      
      // Checklist Items table
      `CREATE TABLE IF NOT EXISTS checklist_items (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(255),
        required BOOLEAN DEFAULT TRUE,
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
      )`,
      
      // Checklist Item Options table (for marking system)
      `CREATE TABLE IF NOT EXISTS checklist_item_options (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL,
        option_text VARCHAR(255) NOT NULL,
        mark VARCHAR(10) NOT NULL,
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE CASCADE
      )`,
      
      // Locations table
      `CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(255),
        state VARCHAR(255),
        country VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Audits table
      `CREATE TABLE IF NOT EXISTS audits (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        restaurant_name VARCHAR(255) NOT NULL,
        location TEXT,
        location_id INTEGER,
        team_id INTEGER,
        scheduled_audit_id INTEGER,
        status VARCHAR(50) DEFAULT 'in_progress',
        score INTEGER,
        total_items INTEGER,
        completed_items INTEGER DEFAULT 0,
        notes TEXT,
        is_mystery_shopper BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (location_id) REFERENCES locations(id)
      )`,
      
      // Audit Items table
      `CREATE TABLE IF NOT EXISTS audit_items (
        id SERIAL PRIMARY KEY,
        audit_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        selected_option_id INTEGER,
        mark VARCHAR(10),
        comment TEXT,
        photo_url TEXT,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES checklist_items(id),
        FOREIGN KEY (selected_option_id) REFERENCES checklist_item_options(id)
      )`,
      
      // Action Items table
      `CREATE TABLE IF NOT EXISTS action_items (
        id SERIAL PRIMARY KEY,
        audit_id INTEGER,
        audit_item_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigned_to INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE,
        FOREIGN KEY (audit_item_id) REFERENCES audit_items(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_to) REFERENCES users(id)
      )`,
      
      // Scheduled Audits table
      `CREATE TABLE IF NOT EXISTS scheduled_audits (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL,
        location_id INTEGER,
        assigned_to INTEGER,
        scheduled_date DATE NOT NULL,
        frequency VARCHAR(50) DEFAULT 'once',
        next_run_date DATE,
        status VARCHAR(50) DEFAULT 'pending',
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
        FOREIGN KEY (location_id) REFERENCES locations(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`,
      
      // Ensure audits table has scheduled_audit_id column (for existing databases)
      `ALTER TABLE IF EXISTS audits ADD COLUMN IF NOT EXISTS scheduled_audit_id INTEGER`,
      
      // Tasks table (for workflow management)
      `CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) DEFAULT 'general',
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        assigned_to INTEGER,
        created_by INTEGER NOT NULL,
        team_id INTEGER,
        action_item_id INTEGER,
        due_date TIMESTAMP,
        reminder_date TIMESTAMP,
        completed_at TIMESTAMP,
        workflow_id INTEGER,
        depends_on_task_id INTEGER,
        location_id INTEGER,
        audit_id INTEGER,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (action_item_id) REFERENCES action_items(id) ON DELETE SET NULL,
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
        FOREIGN KEY (location_id) REFERENCES locations(id),
        FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE SET NULL
      )`,
      
      // Task Dependencies table (for complex dependency chains)
      `CREATE TABLE IF NOT EXISTS task_dependencies (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL,
        depends_on_task_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        UNIQUE(task_id, depends_on_task_id)
      )`,
      
      // Teams table (for team/department management)
      `CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        team_lead_id INTEGER,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_lead_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`,
      
      // Team Members junction table
      `CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(team_id, user_id)
      )`,
      
      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];

    // Execute all queries sequentially
    const executeQueries = async () => {
      try {
        for (const query of queries) {
          await pool.query(query);
        }
        console.log('PostgreSQL tables created/verified');
        resolve();
      } catch (error) {
        console.error('Error creating PostgreSQL tables:', error);
        reject(error);
      }
    };

    executeQueries();
  });
};

// Database query methods (compatible with SQLite interface)
const getDb = () => {
  return {
    // Run a query (for INSERT, UPDATE, DELETE)
    run: (query, params = [], callback) => {
      if (callback) {
        // Callback style (for compatibility with SQLite)
        pool.query(query, params, (err, result) => {
          if (err) {
            return callback(err);
          }
          callback(null, {
            lastID: result.rows[0]?.id || result.insertId,
            changes: result.rowCount || 0
          });
        });
      } else {
        // Promise style
        return pool.query(query, params)
          .then(result => ({
            lastID: result.rows[0]?.id || result.insertId,
            changes: result.rowCount || 0
          }));
      }
    },

    // Get a single row
    get: (query, params = [], callback) => {
      if (callback) {
        pool.query(query, params, (err, result) => {
          if (err) {
            return callback(err);
          }
          callback(null, result.rows[0] || null);
        });
      } else {
        return pool.query(query, params)
          .then(result => result.rows[0] || null);
      }
    },

    // Get all rows
    all: (query, params = [], callback) => {
      if (callback) {
        pool.query(query, params, (err, result) => {
          if (err) {
            return callback(err);
          }
          callback(null, result.rows || []);
        });
      } else {
        return pool.query(query, params)
          .then(result => result.rows || []);
      }
    },

    // Execute a query (returns result object)
    query: (query, params = [], callback) => {
      if (callback) {
        pool.query(query, params, (err, result) => {
          if (err) {
            return callback(err);
          }
          callback(null, result);
        });
      } else {
        return pool.query(query, params);
      }
    }
  };
};

const close = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('PostgreSQL connection pool closed');
  }
};

module.exports = { init, getDb, close };

