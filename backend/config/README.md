# Database Configuration

The application automatically selects the database driver based on environment variables.

## Quick Start

### SQLite (Default)
No configuration needed! Just run:
```bash
npm start
```

### PostgreSQL
Add to `.env`:
```env
DB_TYPE=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

### MySQL
Add to `.env`:
```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=audit_checklists
DB_USER=audit_user
DB_PASSWORD=your_password
```

## Testing Connection

```bash
node scripts/test-database-connection.js
```

## Files

- `database.js` - SQLite driver
- `database-pg.js` - PostgreSQL driver  
- `database-mysql.js` - MySQL driver
- `database-loader.js` - Auto-selects the right driver

See `docs/migration/AUTO_SWITCH_GUIDE.md` for complete documentation.

