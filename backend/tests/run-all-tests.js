#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * 
 * Runs all automated tests for the audit application
 * 
 * Usage:
 *   node tests/run-all-tests.js           # Run all tests
 *   node tests/run-all-tests.js --quick   # Skip slow tests
 *   node tests/run-all-tests.js --setup   # Setup test data first
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');

const args = process.argv.slice(2);
const quickMode = args.includes('--quick');
const setupFirst = args.includes('--setup');

// Colors
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

console.log(`
${c.magenta}╔════════════════════════════════════════════════════════════╗${c.reset}
${c.magenta}║${c.reset}                                                            ${c.magenta}║${c.reset}
${c.magenta}║${c.reset}   ${c.cyan}🧪 AUDIT APP - AUTOMATED TEST SUITE${c.reset}                    ${c.magenta}║${c.reset}
${c.magenta}║${c.reset}                                                            ${c.magenta}║${c.reset}
${c.magenta}╚════════════════════════════════════════════════════════════╝${c.reset}
`);

// Check if server is running
function checkServer() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      timeout: 3000
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
}

// Run a test file
function runTest(name, scriptPath) {
  return new Promise((resolve) => {
    console.log(`\n${c.blue}▶ Running: ${name}${c.reset}`);
    console.log(`${'─'.repeat(60)}`);
    
    const proc = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    proc.on('close', (code) => {
      resolve({ name, passed: code === 0 });
    });
    
    proc.on('error', (err) => {
      console.log(`${c.red}Error: ${err.message}${c.reset}`);
      resolve({ name, passed: false });
    });
  });
}

async function main() {
  const startTime = Date.now();
  const results = [];
  
  // Check server
  console.log(`${c.yellow}📡 Checking backend server...${c.reset}`);
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log(`${c.red}❌ Backend server is not running on port 5000${c.reset}`);
    console.log(`   Start it with: cd backend && npm start`);
    process.exit(1);
  }
  console.log(`${c.green}✓ Server is running${c.reset}`);
  
  // Setup test data if requested
  if (setupFirst) {
    console.log(`\n${c.yellow}🔧 Setting up test data...${c.reset}`);
    try {
      execSync('node tests/setup-test-data.js', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    } catch (e) {
      console.log(`${c.yellow}Warning: Setup may have issues${c.reset}`);
    }
  }
  
  // Run tests
  const tests = [
    { name: 'API Endpoints', script: 'tests/api.test.js' },
    { name: 'API Contract', script: 'tests/api-contract.test.js' },
    { name: 'Full Checklist Completion', script: 'tests/full-checklist-completion.test.js' },
    { name: 'Required Validation', script: 'tests/required-validation.test.js' },
    { name: 'Audit Idempotency', script: 'tests/test-audit-idempotency.js' },
    { name: 'SOS Auto Average', script: 'tests/test-sos-auto-average.js' },
    { name: 'Template Mismatch', script: 'tests/test-template-mismatch.js' },
    { name: 'Report Generation', script: 'tests/test-report-generation.js' }
  ];
  
  if (!quickMode) {
    tests.push({ name: 'Permissions', script: '../tests/permissions.test.js' });
  }
  
  for (const test of tests) {
    const result = await runTest(test.name, test.script);
    results.push(result);
  }
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`
${c.magenta}╔════════════════════════════════════════════════════════════╗${c.reset}
${c.magenta}║${c.reset}                   ${c.cyan}FINAL RESULTS${c.reset}                            ${c.magenta}║${c.reset}
${c.magenta}╠════════════════════════════════════════════════════════════╣${c.reset}`);
  
  results.forEach(r => {
    const icon = r.passed ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
    const status = r.passed ? `${c.green}PASSED${c.reset}` : `${c.red}FAILED${c.reset}`;
    console.log(`${c.magenta}║${c.reset}  ${icon} ${r.name.padEnd(40)} ${status}       ${c.magenta}║${c.reset}`);
  });
  
  console.log(`${c.magenta}╠════════════════════════════════════════════════════════════╣${c.reset}
${c.magenta}║${c.reset}  Test Suites: ${passed}/${results.length} passed                               ${c.magenta}║${c.reset}
${c.magenta}║${c.reset}  Duration:    ${duration}s                                        ${c.magenta}║${c.reset}
${c.magenta}╚════════════════════════════════════════════════════════════╝${c.reset}
`);
  
  process.exit(failed > 0 ? 1 : 0);
}

main();

