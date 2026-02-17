#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const hookPathExpected = '.githooks';
const prePushPath = path.join(rootDir, '.githooks', 'pre-push');

const result = {
  gitAvailable: false,
  nodeVersion: process.version,
  hookPath: null,
  hookPathMatches: false,
  prePushExists: false,
  prePushExecutableHint: null,
};

const fail = message => {
  console.error(`[hooks:doctor] FAIL: ${message}`);
  process.exit(1);
};

const run = command => execSync(command, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

try {
  const gitVersion = run('git --version');
  result.gitAvailable = Boolean(gitVersion);
} catch (_error) {
  fail('Git is not available in PATH. Install Git and retry.');
}

try {
  const hookPath = run('git config --get core.hooksPath');
  result.hookPath = hookPath || null;
} catch (_error) {
  result.hookPath = null;
}

result.hookPathMatches = result.hookPath === hookPathExpected;
result.prePushExists = fs.existsSync(prePushPath);

if (process.platform !== 'win32' && result.prePushExists) {
  try {
    fs.accessSync(prePushPath, fs.constants.X_OK);
    result.prePushExecutableHint = 'ok';
  } catch (_error) {
    result.prePushExecutableHint = 'missing-exec-bit';
  }
}

console.log('[hooks:doctor] Environment Summary');
console.log(`- Node: ${result.nodeVersion}`);
console.log(`- Git available: ${result.gitAvailable ? 'yes' : 'no'}`);
console.log(`- core.hooksPath: ${result.hookPath || '(not set)'}`);
console.log(`- Expected hooks path: ${hookPathExpected}`);
console.log(`- pre-push file exists: ${result.prePushExists ? 'yes' : 'no'}`);

if (result.prePushExecutableHint === 'missing-exec-bit') {
  console.log('- pre-push executable bit: missing (run chmod +x .githooks/pre-push)');
}

if (!result.hookPathMatches) {
  fail('core.hooksPath is not set to .githooks. Run: npm run hooks:install');
}

if (!result.prePushExists) {
  fail('Missing .githooks/pre-push. Restore the hook file.');
}

if (result.prePushExecutableHint === 'missing-exec-bit') {
  fail('pre-push is not executable on this platform. Run: chmod +x .githooks/pre-push');
}

console.log('[hooks:doctor] PASS: Local git hooks are correctly configured.');
process.exit(0);
