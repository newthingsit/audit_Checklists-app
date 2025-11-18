# Quick Start: Database Migration

## Overview

Your application currently uses SQLite, which is perfect for 250+ users. This guide helps you migrate to PostgreSQL or MySQL when you need to scale further.

## When to Migrate

✅ **SQLite is fine for**: 250-500 users, moderate concurrent writes, simple deployments

⚠️ **Consider PostgreSQL/MySQL when**: 
- 1000+ concurrent users
- Heavy simultaneous writes
- Need advanced features (full-text search, complex analytics)
- High availability requirements

## Quick Migration Steps

### Option 1: PostgreSQL (Recommended)

1. **Install PostgreSQL**
   ```bash
   # Windows: Download from postgresql.org
   # Linux: sudo apt-get install postgresql
   # macOS: brew install postgresql
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE audit_checklists;
   CREATE USER audit_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE audit_checklists TO audit_user;
   ```

3. **Install Dependencies**
   ```bash
   cd backend
   npm install pg
   ```

4. **Update Environment**
   ```env
   DB_TYPE=postgresql
   DATABASE_URL=postgresql://audit_user:your_password@localhost:5432/audit_checklists
   ```

5. **Update server.js**
   ```javascript
   const db = require('./config/database-pg');  // Change this line
   ```

6. **Run Migration**
   ```bash
   node scripts/migrate-data-sqlite-to-postgresql.js
   ```

### Option 2: MySQL

1. **Install MySQL**
   ```bash
   # Windows: Download from mysql.com
   # Linux: sudo apt-get install mysql-server
   # macOS: brew install mysql
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE audit_checklists;
   CREATE USER 'audit_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON audit_checklists.* TO 'audit_user'@'localhost';
   ```

3. **Install Dependencies**
   ```bash
   cd backend
   npm install mysql2
   ```

4. **Update Environment**
   ```env
   DB_TYPE=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=audit_checklists
   DB_USER=audit_user
   DB_PASSWORD=your_password
   ```

5. **Update server.js**
   ```javascript
   const db = require('./config/database-mysql');  // Change this line
   ```

6. **Run Migration**
   ```bash
   node scripts/migrate-data-sqlite-to-mysql.js
   ```

## Testing

After migration, test:
- [ ] User login
- [ ] Create audit
- [ ] Update audit items
- [ ] Generate reports
- [ ] All API endpoints

See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for complete checklist.

## Rollback

If migration fails:
1. Revert `server.js` to use `database.js`
2. Restore SQLite backup
3. Restart application

## Need Help?

- Full guide: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- Testing: [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
- Issues: Check migration script logs

## Current Status

✅ **You're good with SQLite!** 

No need to migrate unless you're experiencing:
- Performance issues with 500+ users
- Concurrent write conflicts
- Need for advanced database features

