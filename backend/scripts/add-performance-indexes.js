// Script to add performance indexes to the database
const db = require('../config/database-loader');
const logger = require('../utils/logger');

const indexes = [
  // Audits table indexes
  {
    name: 'idx_audits_user_id',
    table: 'audits',
    column: 'user_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id)'
  },
  {
    name: 'idx_audits_status',
    table: 'audits',
    column: 'status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status)'
  },
  {
    name: 'idx_audits_created_at',
    table: 'audits',
    column: 'created_at',
    sql: 'CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at)'
  },
  {
    name: 'idx_audits_template_id',
    table: 'audits',
    column: 'template_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_audits_template_id ON audits(template_id)'
  },
  {
    name: 'idx_audits_location_id',
    table: 'audits',
    column: 'location_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_audits_location_id ON audits(location_id)'
  },
  {
    name: 'idx_audits_user_status',
    table: 'audits',
    columns: ['user_id', 'status'],
    sql: 'CREATE INDEX IF NOT EXISTS idx_audits_user_status ON audits(user_id, status)'
  },
  // Audit items indexes
  {
    name: 'idx_audit_items_audit_id',
    table: 'audit_items',
    column: 'audit_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_audit_items_audit_id ON audit_items(audit_id)'
  },
  {
    name: 'idx_audit_items_item_id',
    table: 'audit_items',
    column: 'item_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_audit_items_item_id ON audit_items(item_id)'
  },
  // Scheduled audits indexes
  {
    name: 'idx_scheduled_audits_assigned_to',
    table: 'scheduled_audits',
    column: 'assigned_to',
    sql: 'CREATE INDEX IF NOT EXISTS idx_scheduled_audits_assigned_to ON scheduled_audits(assigned_to)'
  },
  {
    name: 'idx_scheduled_audits_created_by',
    table: 'scheduled_audits',
    column: 'created_by',
    sql: 'CREATE INDEX IF NOT EXISTS idx_scheduled_audits_created_by ON scheduled_audits(created_by)'
  },
  {
    name: 'idx_scheduled_audits_date',
    table: 'scheduled_audits',
    column: 'scheduled_date',
    sql: 'CREATE INDEX IF NOT EXISTS idx_scheduled_audits_date ON scheduled_audits(scheduled_date)'
  },
  {
    name: 'idx_scheduled_audits_status',
    table: 'scheduled_audits',
    column: 'status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_scheduled_audits_status ON scheduled_audits(status)'
  },
  // Checklist items indexes
  {
    name: 'idx_checklist_items_template_id',
    table: 'checklist_items',
    column: 'template_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_checklist_items_template_id ON checklist_items(template_id)'
  },
  {
    name: 'idx_checklist_items_category_id',
    table: 'checklist_items',
    column: 'category_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_checklist_items_category_id ON checklist_items(category_id)'
  },
  // Actions indexes
  {
    name: 'idx_actions_audit_id',
    table: 'actions',
    column: 'audit_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_actions_audit_id ON actions(audit_id)'
  },
  {
    name: 'idx_actions_status',
    table: 'actions',
    column: 'status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status)'
  },
  {
    name: 'idx_actions_assigned_to',
    table: 'actions',
    column: 'assigned_to',
    sql: 'CREATE INDEX IF NOT EXISTS idx_actions_assigned_to ON actions(assigned_to)'
  }
];

async function addIndexes() {
  const dbInstance = db.getDb();
  const dbType = process.env.DB_TYPE || 'sqlite';

  logger.info('Starting performance index creation...');
  logger.info(`Database type: ${dbType}`);

  let successCount = 0;
  let errorCount = 0;

  for (const index of indexes) {
    try {
      logger.info(`Creating index: ${index.name} on ${index.table}`);
      
      if (dbType === 'sqlite') {
        await new Promise((resolve, reject) => {
          dbInstance.run(index.sql, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } else {
        // For SQL Server/MySQL, modify syntax if needed
        let sql = index.sql;
        if (dbType === 'mssql' || dbType === 'sqlserver') {
          // SQL Server uses different syntax
          sql = sql.replace('CREATE INDEX IF NOT EXISTS', 'IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = \'' + index.name + '\') CREATE INDEX');
        }
        await dbInstance.query(sql);
      }
      
      logger.info(`✓ Successfully created index: ${index.name}`);
      successCount++;
    } catch (error) {
      logger.error(`✗ Failed to create index ${index.name}:`, error.message);
      errorCount++;
    }
  }

  logger.info('\n=== Index Creation Summary ===');
  logger.info(`Total indexes: ${indexes.length}`);
  logger.info(`Successfully created: ${successCount}`);
  logger.info(`Failed: ${errorCount}`);

  if (errorCount === 0) {
    logger.info('✓ All indexes created successfully!');
  } else {
    logger.warn(`⚠ Some indexes failed to create. Review errors above.`);
  }
}

// Run if called directly
if (require.main === module) {
  addIndexes()
    .then(() => {
      logger.info('Index creation completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Index creation failed:', error);
      process.exit(1);
    });
}

module.exports = { addIndexes };
