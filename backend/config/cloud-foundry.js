const fs = require('fs');
const path = require('path');

/**
 * Database configuration for Cloud Foundry deployment
 * Reads from VCAP_SERVICES for PostgreSQL connection
 */

function getDatabaseConfig() {
  // Check if running on Cloud Foundry
  if (process.env.VCAP_SERVICES) {
    try {
      const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
      
      // Try to find PostgreSQL service (different providers use different names)
      const pgService = 
        vcapServices['elephantsql'] || 
        vcapServices['postgresql'] ||
        vcapServices['postgres'] ||
        vcapServices['postgresql-10'] ||
        vcapServices['postgresql-11'] ||
        vcapServices['postgresql-12'] ||
        vcapServices['postgresql-13'] ||
        vcapServices['postgresql-14'];
      
      if (pgService && pgService.length > 0) {
        const credentials = pgService[0].credentials;
        
        console.log('✅ Cloud Foundry PostgreSQL service detected');
        
        return {
          type: 'postgres',
          host: credentials.host || credentials.hostname,
          port: credentials.port || 5432,
          database: credentials.database || credentials.name,
          username: credentials.username || credentials.user,
          password: credentials.password,
          ssl: true, // Cloud Foundry PostgreSQL typically requires SSL
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false
            }
          }
        };
      }
    } catch (error) {
      console.error('❌ Error parsing VCAP_SERVICES:', error);
    }
  }
  
  // Check for DATABASE_URL (Heroku-style connection string)
  if (process.env.DATABASE_URL) {
    console.log('✅ DATABASE_URL detected');
    return {
      type: 'postgres',
      connectionString: process.env.DATABASE_URL,
      ssl: true,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    };
  }
  
  // Check for Azure SQL Server configuration
  if (process.env.DB_SERVER && process.env.DB_SERVER.includes('database.windows.net')) {
    console.log('✅ Azure SQL Server configuration detected');
    return {
      type: 'mssql',
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME || 'audit_checklist',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '1433'),
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
      }
    };
  }
  
  // Check for generic PostgreSQL configuration
  if (process.env.DB_TYPE === 'postgres' || process.env.PGHOST) {
    console.log('✅ PostgreSQL configuration detected');
    return {
      type: 'postgres',
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432'),
      database: process.env.PGDATABASE || process.env.DB_NAME || 'audit_checklist',
      username: process.env.PGUSER || process.env.DB_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true' || process.env.PGSSLMODE === 'require',
      dialectOptions: process.env.DB_SSL === 'true' ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      } : {}
    };
  }
  
  // Default to SQLite for development
  console.log('⚠️  Using SQLite for development (not suitable for production)');
  return {
    type: 'sqlite',
    filename: path.join(__dirname, '..', 'audit.db')
  };
}

function getConfig() {
  const dbConfig = getDatabaseConfig();
  
  return {
    database: dbConfig,
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    cors: {
      allowedOrigins: process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : ['http://localhost:3000', 'http://localhost:19006']
    },
    server: {
      port: process.env.PORT || 5000,
      nodeEnv: process.env.NODE_ENV || 'development'
    },
    uploads: {
      // Use /tmp for Cloud Foundry (ephemeral file system)
      path: process.env.UPLOAD_PATH || (process.env.VCAP_SERVICES ? '/tmp/uploads' : './uploads/local')
    }
  };
}

module.exports = { getConfig, getDatabaseConfig };
