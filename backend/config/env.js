const isProd = process.env.NODE_ENV === 'production';

const validateEnv = () => {
  const errors = [];
  const warnings = [];

  const hasValue = (value) => {
    if (value === null || value === undefined) return false;
    return String(value).trim().length > 0;
  };

  const parsePositiveInt = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  };

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
  const hasMssql = dbType === 'mssql' || dbType === 'sqlserver' || hasValue(process.env.MSSQL_SERVER);
  const hasPostgres = dbType === 'postgres' || dbType === 'postgresql' || hasValue(process.env.DATABASE_URL);
  const hasMysql = dbType === 'mysql' || (hasValue(process.env.DB_HOST) && hasValue(process.env.DB_USER) && hasValue(process.env.DB_NAME) && !hasValue(process.env.MSSQL_SERVER));

  if (isProd) {
    requireIf(hasValue(process.env.JWT_SECRET), 'JWT_SECRET', 'JWT_SECRET is required in production.');
    warnIf(hasValue(process.env.ALLOWED_ORIGINS), 'ALLOWED_ORIGINS', 'ALLOWED_ORIGINS is not set; default origins will be used.');
    warnIf(String(process.env.TRUST_PROXY || '').toLowerCase() === 'true', 'TRUST_PROXY', 'TRUST_PROXY should be set to true in production behind a reverse proxy.');
    warnIf(String(process.env.FORCE_HTTPS || '').toLowerCase() === 'true', 'FORCE_HTTPS', 'FORCE_HTTPS is not enabled. Consider setting FORCE_HTTPS=true in production.');

    if (hasValue(process.env.JWT_SECRET)) {
      const jwtSecret = String(process.env.JWT_SECRET).trim();
      const weakSecretPatterns = [
        /your-secret-key/i,
        /change-in-production/i,
        /development-only/i,
        /default/i,
        /test/i,
      ];

      if (jwtSecret.length < 32) {
        errors.push({
          name: 'JWT_SECRET',
          message: 'JWT_SECRET must be at least 32 characters in production.',
        });
      }

      if (weakSecretPatterns.some((pattern) => pattern.test(jwtSecret))) {
        errors.push({
          name: 'JWT_SECRET',
          message: 'JWT_SECRET appears to use a placeholder or weak value. Replace it with a strong random secret.',
        });
      }
    }
  }

  if (hasMssql) {
    requireIf(hasValue(process.env.DB_HOST) || hasValue(process.env.MSSQL_SERVER), 'DB_HOST', 'DB_HOST or MSSQL_SERVER is required for SQL Server.');
    requireIf(hasValue(process.env.DB_NAME), 'DB_NAME', 'DB_NAME is required for SQL Server.');
    requireIf(hasValue(process.env.DB_USER), 'DB_USER', 'DB_USER is required for SQL Server.');
    requireIf(hasValue(process.env.DB_PASSWORD), 'DB_PASSWORD', 'DB_PASSWORD is required for SQL Server.');
  } else if (hasPostgres) {
    requireIf(hasValue(process.env.DATABASE_URL), 'DATABASE_URL', 'DATABASE_URL is required for Postgres.');
  } else if (hasMysql) {
    requireIf(hasValue(process.env.DB_HOST), 'DB_HOST', 'DB_HOST is required for MySQL.');
    requireIf(hasValue(process.env.DB_NAME), 'DB_NAME', 'DB_NAME is required for MySQL.');
    requireIf(hasValue(process.env.DB_USER), 'DB_USER', 'DB_USER is required for MySQL.');
    requireIf(hasValue(process.env.DB_PASSWORD), 'DB_PASSWORD', 'DB_PASSWORD is required for MySQL.');
  } else {
    warnIf(!isProd, 'DB_TYPE', 'No database config detected; SQLite will be used.');
  }

  const reportDataTimeout = process.env.REPORT_DATA_TIMEOUT_MS;
  if (hasValue(reportDataTimeout) && parsePositiveInt(reportDataTimeout) === null) {
    warnings.push({ name: 'REPORT_DATA_TIMEOUT_MS', message: 'REPORT_DATA_TIMEOUT_MS should be a positive integer in milliseconds.' });
  }

  const enhancedPdfTimeout = process.env.ENHANCED_PDF_TIMEOUT_MS;
  if (hasValue(enhancedPdfTimeout) && parsePositiveInt(enhancedPdfTimeout) === null) {
    warnings.push({ name: 'ENHANCED_PDF_TIMEOUT_MS', message: 'ENHANCED_PDF_TIMEOUT_MS should be a positive integer in milliseconds.' });
  }

  if (isProd) {
    warnIf(hasValue(process.env.OTEL_EXPORTER_OTLP_ENDPOINT), 'OTEL_EXPORTER_OTLP_ENDPOINT', 'Tracing exporter endpoint is not set.');
  }

  const logRequestsEnabled = String(process.env.LOG_REQUESTS || '').toLowerCase() === 'true';
  warnIf(logRequestsEnabled, 'LOG_REQUESTS', 'Request logging is disabled. Set LOG_REQUESTS=true if request-level logging is required.');

  const metricsEnabled = String(process.env.METRICS_ENABLED || '').toLowerCase() === 'true';
  if (metricsEnabled && isProd) {
    warnIf(hasValue(process.env.METRICS_TOKEN), 'METRICS_TOKEN', 'Metrics enabled without METRICS_TOKEN.');
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
