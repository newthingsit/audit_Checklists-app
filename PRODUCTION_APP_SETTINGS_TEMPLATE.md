# Production App Settings Template

Use this as a copy/paste baseline for backend production configuration.

## Minimum required

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=REPLACE_WITH_STRONG_RANDOM_SECRET_64_PLUS_CHARS
ALLOWED_ORIGINS=https://app.litebitefoods.com,https://www.app.litebitefoods.com
TRUST_PROXY=true
FORCE_HTTPS=true
```

## Database (SQL Server)

```env
DB_TYPE=mssql
DB_HOST=your-sql-server-host
DB_PORT=1433
DB_NAME=audit_checklists
DB_USER=your_db_user
DB_PASSWORD=your_db_password
MSSQL_ENCRYPT=true
MSSQL_TRUST_CERT=false
```

## Report/PDF stability

```env
ENHANCED_PDF_TIMEOUT_MS=15000
REPORT_DATA_TIMEOUT_MS=10000
```

## Recommended operational settings

```env
LOG_REQUESTS=true
METRICS_ENABLED=false
SHUTDOWN_TIMEOUT_MS=15000
SERVER_KEEPALIVE_MS=65000
SERVER_HEADERS_TIMEOUT_MS=70000
```

## Validate before deploy

From repo root:

```bash
npm run env:check:prod
npm run preflight:prod
```

From backend folder:

```bash
npm run env:check:prod
```

## Notes

- Use `backend/.env.production.example` as the full reference.
- If your SQL Server uses a self-signed cert in controlled environments, set `MSSQL_TRUST_CERT=true`.
- Do not deploy with placeholder `JWT_SECRET` values.
