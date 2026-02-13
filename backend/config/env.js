const isProd = process.env.NODE_ENV === 'production';

const validateEnv = () => {
  const errors = [];
  const warnings = [];

  const requireIf = (condition, name, message) => {
    if (!condition) {
      errors.push({ name, message });
    }
  };

  const warnIf = (condition, name, message) => {
    if (!condition) {
      warnings.push({ name, message });
    }
  };

  const dbType = String(process.env.DB_TYPE || '').toLowerCase();
  const hasMssql = dbType === 'mssql' || dbType === 'sqlserver' || !!process.env.MSSQL_SERVER;
  const hasPostgres = dbType === 'postgres' || dbType === 'postgresql' || !!process.env.DATABASE_URL;
  const hasMysql = dbType === 'mysql' || (!!process.env.DB_HOST && !!process.env.DB_USER && !!process.env.DB_NAME && !process.env.MSSQL_SERVER);

  if (isProd) {
    requireIf(!!process.env.JWT_SECRET, 'JWT_SECRET', 'JWT_SECRET is required in production.');
    warnIf(!!process.env.ALLOWED_ORIGINS, 'ALLOWED_ORIGINS', 'ALLOWED_ORIGINS is not set; default origins will be used.');
  }

  if (hasMssql) {
    requireIf(!!(process.env.DB_HOST || process.env.MSSQL_SERVER), 'DB_HOST', 'DB_HOST or MSSQL_SERVER is required for SQL Server.');
    requireIf(!!process.env.DB_NAME, 'DB_NAME', 'DB_NAME is required for SQL Server.');
    requireIf(!!process.env.DB_USER, 'DB_USER', 'DB_USER is required for SQL Server.');
    requireIf(!!process.env.DB_PASSWORD, 'DB_PASSWORD', 'DB_PASSWORD is required for SQL Server.');
  } else if (hasPostgres) {
    requireIf(!!process.env.DATABASE_URL, 'DATABASE_URL', 'DATABASE_URL is required for Postgres.');
  } else if (hasMysql) {
    requireIf(!!process.env.DB_HOST, 'DB_HOST', 'DB_HOST is required for MySQL.');
    requireIf(!!process.env.DB_NAME, 'DB_NAME', 'DB_NAME is required for MySQL.');
    requireIf(!!process.env.DB_USER, 'DB_USER', 'DB_USER is required for MySQL.');
    requireIf(!!process.env.DB_PASSWORD, 'DB_PASSWORD', 'DB_PASSWORD is required for MySQL.');
  } else {
    warnIf(!isProd, 'DB_TYPE', 'No database config detected; SQLite will be used.');
  }

  warnIf(!!process.env.OTEL_EXPORTER_OTLP_ENDPOINT, 'OTEL_EXPORTER_OTLP_ENDPOINT', 'Tracing exporter endpoint is not set.');
  warnIf(!!process.env.LOG_REQUESTS, 'LOG_REQUESTS', 'Request logging is disabled.');

  const metricsEnabled = String(process.env.METRICS_ENABLED || '').toLowerCase() === 'true';
  if (metricsEnabled && isProd) {
    warnIf(!!process.env.METRICS_TOKEN, 'METRICS_TOKEN', 'Metrics enabled without METRICS_TOKEN.');
  }

  return { errors, warnings };
};

const validateEnvOrThrow = (logger) => {
  const report = validateEnv();
  const log = logger || console;

  report.warnings.forEach((warning) => {
    if (log.warn) {
      log.warn('[Env Warning]', warning);
    } else {
      console.warn('[Env Warning]', warning);
    }
  });

  if (report.errors.length > 0) {
    report.errors.forEach((error) => {
      if (log.error) {
        log.error('[Env Error]', error);
      } else {
        console.error('[Env Error]', error);
      }
    });
    const error = new Error('Invalid environment configuration.');
    error.details = report.errors;
    throw error;
  }

  return report;
};

module.exports = {
  validateEnv,
  validateEnvOrThrow,
};
