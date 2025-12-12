/**
 * Script to clear rate limit for a specific IP or all IPs
 * Note: This only works if using in-memory store (default)
 * For Redis or other stores, you'd need to clear them separately
 * 
 * Usage: 
 *   node backend/scripts/clear-rate-limit.js
 *   node backend/scripts/clear-rate-limit.js <ip-address>
 */

console.log('⚠️  Rate limit clearing script');
console.log('Note: Rate limits are stored in memory by default.');
console.log('To clear rate limits, you need to restart the backend server.');
console.log('\nTo clear rate limits:');
console.log('1. Stop the backend server (Ctrl+C)');
console.log('2. Restart the backend server');
console.log('3. Rate limits will be reset\n');

// If using Redis or other persistent stores, you would clear them here
// For now, just provide instructions

process.exit(0);

