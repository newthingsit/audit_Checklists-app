require('dotenv').config();

const { validateEnv } = require('../config/env');

const report = validateEnv();

if (report.warnings.length > 0) {
  console.log('[Env Check] Warnings:');
  report.warnings.forEach((warning) => {
    console.log(`- ${warning.name}: ${warning.message}`);
  });
}

if (report.errors.length > 0) {
  console.error('[Env Check] Errors:');
  report.errors.forEach((error) => {
    console.error(`- ${error.name}: ${error.message}`);
  });
  process.exit(1);
}

console.log('[Env Check] Environment configuration is valid.');
process.exit(0);
