#!/usr/bin/env node

/**
 * Master Test Runner - Audit Application
 * 
 * Runs all automated tests across backend, web, and mobile
 * 
 * Usage:
 *   node scripts/run-all-tests.js           # Run all tests
 *   node scripts/run-all-tests.js --backend # Run only backend tests
 *   node scripts/run-all-tests.js --web     # Run only web tests
 *   node scripts/run-all-tests.js --quick   # Quick tests only
 */

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const args = process.argv.slice(2);
const runBackend = args.length === 0 || args.includes('--backend') || args.includes('--all');
const runWeb = args.includes('--web') || args.includes('--all');
const runMobile = args.includes('--mobile') || args.includes('--all');
const quickMode = args.includes('--quick');

// Colors
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m'
};

const rootDir = path.join(__dirname, '..');

console.log(`
${c.magenta}╔══════════════════════════════════════════════════════════════════╗${c.reset}
${c.magenta}║${c.reset}                                                                  ${c.magenta}║${c.reset}
${c.magenta}║${c.reset}   ${c.cyan}🧪 AUDIT CHECKLIST APP - COMPREHENSIVE TEST SUITE${c.reset}            ${c.magenta}║${c.reset}
${c.magenta}║${c.reset}                                                                  ${c.magenta}║${c.reset}
${c.magenta}╚══════════════════════════════════════════════════════════════════╝${c.reset}
`);

// Check if server is running
function checkServer(port = 5000) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port,
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

// Start backend server if not running
function startBackendServer() {
  console.log(`${c.yellow}🚀 Starting backend server...${c.reset}`);
  const proc = spawn('npm', ['start'], {
    cwd: path.join(rootDir, 'backend'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env }
  });
  return proc;
}

// Run command and return promise
function runCommand(command, cwd, label) {
  return new Promise((resolve) => {
    console.log(`\n${c.blue}═══ ${label} ═══${c.reset}`);
    console.log(`${c.dim}Running: ${command}${c.reset}`);
    console.log('─'.repeat(60));
    
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'powershell.exe' : '/bin/bash';
    const shellArgs = isWindows ? ['-Command', command] : ['-c', command];
    
    const proc = spawn(shell, shellArgs, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' }
    });
    
    proc.on('close', (code) => {
      resolve({ label, passed: code === 0, code });
    });
    
    proc.on('error', (err) => {
      console.log(`${c.red}Error: ${err.message}${c.reset}`);
      resolve({ label, passed: false, code: 1 });
    });
  });
}

async function main() {
  const startTime = Date.now();
  const results = [];
  let backendProc = null;
  
  // Check server for backend tests
  if (runBackend) {
    console.log(`${c.yellow}📡 Checking backend server...${c.reset}`);
    const serverRunning = await checkServer(5000);
    
    if (!serverRunning) {
      backendProc = startBackendServer();
      let ready = false;
      for (let i = 0; i < 30; i++) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await checkServer(5000);
        if (ok) {
          ready = true;
          break;
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      if (!ready) {
        console.log(`${c.red}❌ Backend server failed to start on port 5000${c.reset}`);
        if (backendProc) backendProc.kill();
        process.exit(1);
      }
    }
    console.log(`${c.green}✓ Server is running${c.reset}`);
  }
  
  // Run Backend Tests
  if (runBackend) {
    const backendResult = await runCommand(
      'npm test',
      path.join(rootDir, 'backend'),
      'Backend API Tests'
    );
    results.push(backendResult);
  }
  
  // Run Web Tests (unit)
  if (runWeb) {
    const webUnitResult = await runCommand(
      'npm test -- --watchAll=false --passWithNoTests',
      path.join(rootDir, 'web'),
      'Web Frontend Unit Tests'
    );
    results.push(webUnitResult);
  }

  // Run Web E2E tests (Playwright)
  if (runWeb && !quickMode) {
    const webE2eResult = await runCommand(
      'npm run test:e2e',
      path.join(rootDir, 'web'),
      'Web E2E Smoke Tests'
    );
    results.push(webE2eResult);
  }

  // Run Mobile tests
  if (runMobile) {
    const mobileResult = await runCommand(
      'npm test',
      path.join(rootDir, 'mobile'),
      'Mobile Logic Tests'
    );
    results.push(mobileResult);
  }
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`
${c.magenta}╔══════════════════════════════════════════════════════════════════╗${c.reset}
${c.magenta}║${c.reset}                      ${c.cyan}OVERALL RESULTS${c.reset}                            ${c.magenta}║${c.reset}
${c.magenta}╠══════════════════════════════════════════════════════════════════╣${c.reset}`);
  
  results.forEach(r => {
    const icon = r.passed ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
    const status = r.passed ? `${c.green}PASSED${c.reset}` : `${c.red}FAILED${c.reset}`;
    console.log(`${c.magenta}║${c.reset}  ${icon} ${r.label.padEnd(45)} ${status}       ${c.magenta}║${c.reset}`);
  });
  
  const allPassed = failed === 0;
  const statusIcon = allPassed ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
  const statusText = allPassed ? `${c.green}ALL TESTS PASSED${c.reset}` : `${c.red}SOME TESTS FAILED${c.reset}`;
  
  console.log(`${c.magenta}╠══════════════════════════════════════════════════════════════════╣${c.reset}
${c.magenta}║${c.reset}                                                                  ${c.magenta}║${c.reset}
${c.magenta}║${c.reset}  ${statusIcon} ${statusText}                                        ${c.magenta}║${c.reset}
${c.magenta}║${c.reset}  ─────────────────────────────────                                ${c.magenta}║${c.reset}
${c.magenta}║${c.reset}  Test Suites: ${passed}/${results.length} passed                                         ${c.magenta}║${c.reset}
${c.magenta}║${c.reset}  Duration:    ${duration}s                                              ${c.magenta}║${c.reset}
${c.magenta}║${c.reset}                                                                  ${c.magenta}║${c.reset}
${c.magenta}╚══════════════════════════════════════════════════════════════════╝${c.reset}
`);
  
  if (backendProc) {
    backendProc.kill();
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

