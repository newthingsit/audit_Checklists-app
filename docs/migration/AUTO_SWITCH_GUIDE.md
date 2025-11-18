# Automatic Database Switching Guide

The application now automatically selects the database (SQLite, PostgreSQL, or MySQL) based on your environment configuration. No code changes needed!

## How It Works

The `database-loader.js` automatically detects which database to use based on:

1. **DB_TYPE** environment variable (highest priority)
2. **DATABASE_URL** (assumes PostgreSQL if present)
3. **MySQL connection variables** (DB_HOST, DB_USER, DB_NAME)
4. **Defaults to SQLite** if nothing is configured

## Quick Setup

### Option 1: SQLite (Default - No Setup Needed)

Just run the application - SQLite is used by default!

```bash
npm start
```

### Option 2: PostgreSQL

Create/update `.env` file:

```env
DB_TYPE=postgresql
DATABASE_URL=postgresql://username:password@localhost:5432/audit_checklists
```

Or use individual variables:

```env
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=audit_checklists
DB_USER=audit_user
DB_PASSWORD=your_password
```

### Option 3: MySQL

Create/update `.env` file:

```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=audit_checklists
DB_USER=audit_user
DB_PASSWORD=your_password
```

## Testing Your Connection

Test your database connection:

```bash
node scripts/test-database-connection.js
```

This will:
- ✅ Test the connection
- ✅ Show database version
- ✅ List all tables
- ✅ Verify everything works

## Migration Workflow

### From SQLite to PostgreSQL/MySQL

1. **Install the database** (PostgreSQL or MySQL)

2. **Create the database and user** (see main migration guide)

3. **Update `.env` file** with database credentials

4. **Test connection:**
   ```bash
   node scripts/test-database-connection.js
   ```

5. **Run data migration:**
   ```bash
   # For PostgreSQL
   node scripts/migrate-data-sqlite-to-postgresql.js
   
   # For MySQL
   node scripts/migrate-data-sqlite-to-mysql.js
   ```

6. **Start the application:**
   ```bash
   npm start
   ```

The application will automatically use the new database!

## Switching Back to SQLite

Simply remove or comment out the database configuration in `.env`:

```env
# DB_TYPE=postgresql
# DATABASE_URL=...
```

Or set:

```env
DB_TYPE=sqlite
```

## Environment Variables Reference

| Variable | Description | Required For |
|----------|-------------|--------------|
| `DB_TYPE` | Database type: `sqlite`, `postgresql`, or `mysql` | All (optional, defaults to sqlite) |
| `DATABASE_URL` | Full PostgreSQL connection string | PostgreSQL |
| `DB_HOST` | Database host | PostgreSQL/MySQL |
| `DB_PORT` | Database port | PostgreSQL/MySQL |
| `DB_NAME` | Database name | PostgreSQL/MySQL |
| `DB_USER` | Database user | PostgreSQL/MySQL |
| `DB_PASSWORD` | Database password | PostgreSQL/MySQL |

## Troubleshooting

### "Error loading PostgreSQL driver"

Install the driver:
```bash
npm install pg
```

### "Error loading MySQL driver"

Install the driver:
```bash
npm install mysql2
```

### "Database connection failed"

1. Check database server is running
2. Verify credentials in `.env`
3. Ensure database exists
4. Check firewall/network settings
5. Run test script: `node scripts/test-database-connection.js`

## Benefits

✅ **No code changes** - Just update `.env`  
✅ **Automatic detection** - Smart database selection  
✅ **Easy switching** - Change databases anytime  
✅ **Development friendly** - Use SQLite locally, PostgreSQL in production  
✅ **Migration ready** - Scripts handle data transfer  

## Example Workflow

```bash
# 1. Start with SQLite (default)
npm start
# ✅ Uses SQLite automatically

# 2. Set up PostgreSQL
# Edit .env: DB_TYPE=postgresql, DATABASE_URL=...

# 3. Test connection
node scripts/test-database-connection.js
# ✅ Connection verified

# 4. Migrate data
node scripts/migrate-data-sqlite-to-postgresql.js
# ✅ Data migrated

# 5. Restart application
npm start
# ✅ Now using PostgreSQL automatically!
```

That's it! The application handles everything automatically.

