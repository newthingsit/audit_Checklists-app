#!/usr/bin/env node

/**
 * Mobile logic test runner (headless)
 */

const { spawn } = require('child_process');
const path = require('path');

const scripts = [
  'regression-sos-autocalc.js',
  'regression-signature-enable.mjs',
  'regression-offline-draft.mjs'
];

const rootDir = path.join(__dirname, '..');

function runScript(script) {
  return new Promise((resolve) => {
    const proc = spawn('node', [path.join(__dirname, script)], {
      stdio: 'inherit',
      cwd: rootDir
    });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

async function main() {
  let allPassed = true;
  for (const script of scripts) {
    console.log(`\n[Mobile Tests] Running ${script}`);
    const passed = await runScript(script);
    if (!passed) allPassed = false;
  }
  process.exit(allPassed ? 0 : 1);
}

main();
