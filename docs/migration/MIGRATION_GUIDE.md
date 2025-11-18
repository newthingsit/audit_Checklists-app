# Database Migration Guide: SQLite to PostgreSQL/MySQL

This guide provides step-by-step instructions for migrating from SQLite to PostgreSQL or MySQL when scaling beyond 250+ users or requiring better concurrent write performance.

## Table of Contents

1. [When to Migrate](#when-to-migrate)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [PostgreSQL Migration](#postgresql-migration)
4. [MySQL Migration](#mysql-migration)
5. [Data Migration](#data-migration)
6. [Testing](#testing)
7. [Rollback Plan](#rollback-plan)
8. [Post-Migration Optimization](#post-migration-optimization)

## When to Migrate

Consider migrating when:
- **User count**: 1000+ concurrent users
- **Write concurrency**: Heavy simultaneous writes (multiple users creating/updating audits simultaneously)
- **Data volume**: Millions of records
- **Advanced features needed**: Full-text search, complex analytics, stored procedures
- **High availability**: Need for replication, clustering, or failover

## Pre-Migration Checklist

- [ ] Backup SQLite database
- [ ] Document current database size and record counts
- [ ] Test migration on a development/staging environment first
- [ ] Schedule maintenance window (if production)
- [ ] Prepare rollback plan
- [ ] Update environment variables
- [ ] Install required database drivers

## PostgreSQL Migration

### Step 1: Install PostgreSQL

**Windows:**
```bash
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

### Step 2: Create Database and User

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE audit_checklists;

-- Create user
CREATE USER audit_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE audit_checklists TO audit_user;

-- Connect to the new database
\c audit_checklists

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO audit_user;
```

### Step 3: Install Node.js Dependencies

```bash
cd backend
npm install pg
```

### Step 4: Update Environment Variables

Create or update `.env` file:

```env
# Database Configuration
DB_TYPE=postgresql
DATABASE_URL=postgresql://audit_user:your_secure_password@localhost:5432/audit_checklists

# Or use individual variables:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=audit_checklists
DB_USER=audit_user
DB_PASSWORD=your_secure_password
```

### Step 5: Update Server Configuration

Update `backend/server.js` to use PostgreSQL:

```javascript
// Change from:
const db = require('./config/database');

// To:
const db = require('./config/database-pg');
```

### Step 6: Run Schema Migration

The PostgreSQL schema will be created automatically on server start, or run manually:

```bash
node scripts/migrate-to-postgresql.js
```

### Step 7: Migrate Data

```bash
node scripts/migrate-data-sqlite-to-postgresql.js
```

## MySQL Migration

### Step 1: Install MySQL

**Windows:**
```bash
# Download from https://dev.mysql.com/downloads/installer/
# Or use Chocolatey:
choco install mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install mysql-server
```

**macOS:**
```bash
brew install mysql
brew services start mysql
```

### Step 2: Create Database and User

```sql
-- Connect to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE audit_checklists CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'audit_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON audit_checklists.* TO 'audit_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 3: Install Node.js Dependencies

```bash
cd backend
npm install mysql2
```

### Step 4: Update Environment Variables

```env
DB_TYPE=mysql
DATABASE_URL=mysql://audit_user:your_secure_password@localhost:3306/audit_checklists

# Or use individual variables:
DB_HOST=localhost
DB_PORT=3306
DB_NAME=audit_checklists
DB_USER=audit_user
DB_PASSWORD=your_secure_password
```

### Step 5: Update Server Configuration

```javascript
const db = require('./config/database-mysql');
```

### Step 6: Run Schema Migration

```bash
node scripts/migrate-to-mysql.js
```

### Step 7: Migrate Data

```bash
node scripts/migrate-data-sqlite-to-mysql.js
```

## Data Migration

### Automated Migration Script

The migration scripts will:
1. Connect to SQLite source database
2. Connect to target database (PostgreSQL/MySQL)
3. Export all data from SQLite
4. Transform data types as needed
5. Import into target database
6. Verify data integrity
7. Generate migration report

### Manual Migration Steps

If you need to migrate manually:

1. **Export SQLite data:**
   ```bash
   sqlite3 data/audit.db .dump > backup.sql
   ```

2. **Transform SQL syntax** (PostgreSQL/MySQL specific)

3. **Import to target database:**
   ```bash
   # PostgreSQL
   psql -U audit_user -d audit_checklists < transformed_backup.sql
   
   # MySQL
   mysql -u audit_user -p audit_checklists < transformed_backup.sql
   ```

## Testing

### Pre-Migration Testing

1. **Data Count Verification:**
   ```sql
   -- SQLite
   SELECT 'users' as table_name, COUNT(*) as count FROM users
   UNION ALL SELECT 'audits', COUNT(*) FROM audits
   UNION ALL SELECT 'checklist_items', COUNT(*) FROM checklist_items;
   
   -- PostgreSQL/MySQL (after migration)
   -- Run same query and compare counts
   ```

2. **Functional Testing:**
   - [ ] User authentication
   - [ ] Create new audit
   - [ ] Update audit items
   - [ ] Generate reports
   - [ ] File uploads
   - [ ] Scheduled audits
   - [ ] Action items

3. **Performance Testing:**
   - [ ] Query response times
   - [ ] Concurrent user load
   - [ ] Write operations

### Post-Migration Testing

1. Run full test suite
2. Verify all API endpoints
3. Check data integrity
4. Monitor error logs
5. Performance benchmarks

## Rollback Plan

### If Migration Fails

1. **Stop the application**
2. **Revert server configuration:**
   ```javascript
   // Change back to SQLite
   const db = require('./config/database');
   ```
3. **Restore SQLite backup:**
   ```bash
   cp backup/audit.db.backup data/audit.db
   ```
4. **Restart application**
5. **Verify functionality**

### Rollback Checklist

- [ ] Stop application
- [ ] Revert code changes
- [ ] Restore SQLite database
- [ ] Update environment variables
- [ ] Restart application
- [ ] Verify all features work
- [ ] Document issues encountered

## Post-Migration Optimization

### PostgreSQL Optimizations

1. **Create indexes:**
   ```sql
   CREATE INDEX CONCURRENTLY idx_audits_user_created ON audits(user_id, created_at);
   CREATE INDEX CONCURRENTLY idx_audit_items_audit_status ON audit_items(audit_id, status);
   ```

2. **Analyze tables:**
   ```sql
   ANALYZE audits;
   ANALYZE audit_items;
   ```

3. **Configure connection pooling:**
   ```javascript
   // In database-pg.js
   pool = new Pool({
     connectionString: databaseUrl,
     max: 20, // Maximum pool size
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

### MySQL Optimizations

1. **Create indexes:**
   ```sql
   CREATE INDEX idx_audits_user_created ON audits(user_id, created_at);
   CREATE INDEX idx_audit_items_audit_status ON audit_items(audit_id, status);
   ```

2. **Optimize tables:**
   ```sql
   OPTIMIZE TABLE audits;
   OPTIMIZE TABLE audit_items;
   ```

3. **Configure connection pool:**
   ```javascript
   // In database-mysql.js
   pool = mysql.createPool({
     connectionLimit: 10,
     host: process.env.DB_HOST,
     user: process.env.DB_USER,
     password: process.env.DB_PASSWORD,
     database: process.env.DB_NAME,
   });
   ```

## Troubleshooting

### Common Issues

1. **Connection refused:**
   - Check database service is running
   - Verify connection credentials
   - Check firewall settings

2. **Permission denied:**
   - Verify user has proper privileges
   - Check database permissions

3. **Data type errors:**
   - Review migration script logs
   - Check for NULL values in NOT NULL columns
   - Verify date/time formats

4. **Foreign key violations:**
   - Ensure data is migrated in correct order
   - Check for orphaned records

## Support

For issues or questions:
1. Check migration script logs
2. Review database error logs
3. Consult database-specific documentation
4. Contact development team

## Next Steps

After successful migration:
1. Monitor performance metrics
2. Set up database backups
3. Configure replication (if needed)
4. Update documentation
5. Train team on new database

