# SQL Server Setup Guide

This guide helps you set up SQL Server for the Audit Checklists application.

## Prerequisites

- SQL Server Express or Full Edition installed
- SQL Server Management Studio (SSMS) or Azure Data Studio
- Node.js with npm

## Installation

### 1. Install SQL Server

**Download SQL Server Express (Free):**
- Visit: https://www.microsoft.com/en-us/sql-server/sql-server-downloads
- Download SQL Server Express
- Run installer and follow setup wizard
- Note your instance name (usually `LOCALHOST\SQLEXPRESS`)

### 2. Install Node.js Driver

```bash
cd backend
npm install mssql
```

## Configuration

### Option 1: Using .env File

Create or update `.env` file in the `backend` directory:

```env
# SQL Server Configuration
DB_TYPE=mssql
DB_HOST=localhost\SQLEXPRESS
DB_PORT=1433
DB_NAME=audit_checklists
DB_USER=sa
DB_PASSWORD=your_password

# Or use MSSQL-specific variables:
MSSQL_SERVER=localhost\SQLEXPRESS
MSSQL_PORT=1433
MSSQL_DATABASE=audit_checklists
MSSQL_USER=sa
MSSQL_PASSWORD=your_password
MSSQL_ENCRYPT=false
MSSQL_TRUST_CERT=true
```

### Option 2: Connection String (Alternative)

You can also use a connection string format, but the individual variables above are recommended.

## Database Setup

### 1. Create Database

**Using SQL Server Management Studio:**

1. Open SSMS
2. Connect to your SQL Server instance
3. Right-click "Databases" → "New Database"
4. Name: `audit_checklists`
5. Click "OK"

**Using SQL Command:**

```sql
CREATE DATABASE audit_checklists;
GO
```

### 2. Create User (Optional - if not using 'sa')

```sql
USE audit_checklists;
GO

CREATE LOGIN audit_user WITH PASSWORD = 'your_secure_password';
GO

CREATE USER audit_user FOR LOGIN audit_user;
GO

ALTER ROLE db_owner ADD MEMBER audit_user;
GO
```

### 3. Verify Connection

Test your connection:

```bash
node scripts/test-database-connection.js
```

## Migration Steps

### 1. Start Application (Creates Schema)

The first time you start the application with SQL Server configured, it will automatically create all tables:

```bash
npm start
```

### 2. Migrate Data from SQLite

If you have existing SQLite data:

```bash
node scripts/migrate-data-sqlite-to-mssql.js
```

To clear existing data first:

```bash
node scripts/migrate-data-sqlite-to-mssql.js --clear
```

## Connection Properties

Based on your connection dialog, here's what to set:

| Dialog Field | .env Variable | Example Value |
|-------------|---------------|---------------|
| Server Name | DB_HOST or MSSQL_SERVER | `localhost\SQLEXPRESS` |
| Authentication | - | SQL Server Authentication |
| User Name | DB_USER or MSSQL_USER | `sa` |
| Password | DB_PASSWORD or MSSQL_PASSWORD | `your_password` |
| Database Name | DB_NAME or MSSQL_DATABASE | `audit_checklists` |
| Encrypt | MSSQL_ENCRYPT | `false` (for local) |
| Trust Server Certificate | MSSQL_TRUST_CERT | `true` (for local) |

## Troubleshooting

### "Cannot connect to server"

1. **Check SQL Server is running:**
   - Open Services (services.msc)
   - Find "SQL Server (SQLEXPRESS)" or your instance
   - Ensure it's running

2. **Check SQL Server Browser:**
   - Enable SQL Server Browser service
   - This is needed for named instances

3. **Check Firewall:**
   - Allow port 1433 (default) or your custom port
   - Allow SQL Server Browser (UDP 1434)

### "Login failed for user"

1. Verify username and password
2. Check SQL Server Authentication is enabled:
   - SQL Server Properties → Security
   - Enable "SQL Server and Windows Authentication mode"
   - Restart SQL Server service

### "Database does not exist"

1. Create the database first (see Database Setup above)
2. Verify database name in .env matches

### "Trust Server Certificate" errors

For local development, set:
```env
MSSQL_TRUST_CERT=true
MSSQL_ENCRYPT=false
```

## Security Best Practices

### For Production:

1. **Don't use 'sa' account:**
   - Create dedicated user with minimal privileges
   - Use strong passwords

2. **Enable encryption:**
   ```env
   MSSQL_ENCRYPT=true
   MSSQL_TRUST_CERT=false
   ```

3. **Use Windows Authentication (if possible):**
   - More secure for Windows environments
   - No password in connection string

4. **Restrict network access:**
   - Use firewall rules
   - Limit to specific IP addresses

## Testing

After setup, verify everything works:

1. **Test connection:**
   ```bash
   node scripts/test-database-connection.js
   ```

2. **Start application:**
   ```bash
   npm start
   ```

3. **Test API endpoints:**
   - Login
   - Create audit
   - View reports

## Next Steps

- [ ] Database created
- [ ] User configured
- [ ] .env file updated
- [ ] Connection tested
- [ ] Schema created (on first app start)
- [ ] Data migrated (if applicable)
- [ ] Application tested

## Support

For issues:
1. Check SQL Server error logs
2. Review connection string format
3. Verify SQL Server services are running
4. Check firewall settings
5. Review application logs

