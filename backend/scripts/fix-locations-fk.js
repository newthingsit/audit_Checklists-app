// Script to fix the locations table foreign key constraint for SQL Server
require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.DB_HOST || process.env.MSSQL_SERVER,
  port: parseInt(process.env.DB_PORT || process.env.MSSQL_PORT || '1433'),
  database: process.env.DB_NAME || process.env.MSSQL_DATABASE || 'audit_checklists',
  user: process.env.DB_USER || process.env.MSSQL_USER,
  password: process.env.DB_PASSWORD || process.env.MSSQL_PASSWORD,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT !== 'false',
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function fixLocationsForeignKey() {
  let pool;
  try {
    console.log('Connecting to SQL Server...');
    pool = await sql.connect(config);
    console.log('Connected!');

    // Find and drop any existing FK constraints on parent_id
    console.log('Finding existing foreign key constraints on locations.parent_id...');
    const fkResult = await pool.request().query(`
      SELECT fk.name AS constraint_name
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.columns c ON fkc.parent_column_id = c.column_id AND fkc.parent_object_id = c.object_id
      WHERE OBJECT_NAME(fk.parent_object_id) = 'locations'
      AND c.name = 'parent_id'
    `);

    if (fkResult.recordset.length > 0) {
      for (const row of fkResult.recordset) {
        console.log(`Dropping constraint: ${row.constraint_name}`);
        await pool.request().query(`
          ALTER TABLE [dbo].[locations] DROP CONSTRAINT [${row.constraint_name}]
        `);
        console.log(`Dropped constraint: ${row.constraint_name}`);
      }
    } else {
      console.log('No existing parent_id foreign key constraints found.');
    }

    // Check if parent_id column exists
    const columnCheck = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'locations' AND COLUMN_NAME = 'parent_id'
    `);

    if (columnCheck.recordset.length === 0) {
      console.log('Adding parent_id column...');
      await pool.request().query(`
        ALTER TABLE [dbo].[locations] ADD [parent_id] INT NULL
      `);
    }

    // Add the corrected foreign key constraint with NO ACTION
    console.log('Adding new foreign key constraint with ON DELETE NO ACTION...');
    await pool.request().query(`
      ALTER TABLE [dbo].[locations]
      ADD CONSTRAINT [FK_locations_parent_id] 
      FOREIGN KEY ([parent_id]) REFERENCES [locations]([id]) ON DELETE NO ACTION
    `);
    
    console.log('Foreign key constraint fixed successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('already exists')) {
      console.log('Constraint already exists with correct settings.');
    }
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

fixLocationsForeignKey();

