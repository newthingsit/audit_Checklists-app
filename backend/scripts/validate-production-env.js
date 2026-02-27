/**
 * Validates backend environment with production rules.
 *
 * Usage:
 *   node scripts/validate-production-env.js
 */

require('dotenv').config();

process.env.NODE_ENV = 'production';

const { validateEnv } = require('../config/env');

const report = validateEnv();

console.log('🔍 Production environment validation\n');

if (report.warnings.length > 0) {
  console.log('⚠️  Warnings:');
  report.warnings.forEach((warning) => {
    console.log(`  - [${warning.name}] ${warning.message}`);
  });
  console.log('');
}

if (report.errors.length > 0) {
  console.error('❌ Errors:');
  report.errors.forEach((error) => {
    console.error(`  - [${error.name}] ${error.message}`);
  });
  console.error('');
  console.error('Fix the above environment errors before deploying to production.');
  process.exit(1);
}

console.log('✅ Environment checks passed for production rules.');
process.exit(0);
