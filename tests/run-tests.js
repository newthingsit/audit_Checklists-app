#!/usr/bin/env node

/**
 * Test Runner Script
 * 
 * This script runs the comprehensive permissions test suite.
 * 
 * Usage:
 *   node tests/run-tests.js
 *   node tests/run-tests.js --verbose
 *   node tests/run-tests.js --user admin@test.com
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const userFilter = args.find(arg => arg.startsWith('--user='))?.split('=')[1];

console.log('🧪 Permissions Test Runner');
console.log('='.repeat(60));
console.log('');

// Check if backend server is running
const checkServer = () => {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
};

// Run tests
const runTests = async () => {
  console.log('📡 Checking backend server...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Backend server is not running on port 5000');
    console.log('   Please start the backend server first:');
    console.log('   cd backend && npm start');
    process.exit(1);
  }
  
  console.log('✅ Backend server is running');
  console.log('');
  
  console.log('🚀 Starting test suite...');
  console.log('');
  
  const testFile = path.join(__dirname, 'permissions.test.js');
  const testProcess = spawn('node', [testFile], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  testProcess.on('close', (code) => {
    console.log('');
    if (code === 0) {
      console.log('✅ All tests completed successfully!');
    } else {
      console.log(`❌ Tests completed with exit code ${code}`);
    }
    process.exit(code);
  });
  
  testProcess.on('error', (error) => {
    console.error('❌ Failed to start test process:', error);
    process.exit(1);
  });
};

runTests();

