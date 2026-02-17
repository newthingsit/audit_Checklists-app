#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);

const getArgValue = flag => {
  const exact = args.find(a => a.startsWith(`${flag}=`));
  if (exact) return exact.split('=').slice(1).join('=').trim();
  const idx = args.indexOf(flag);
  if (idx >= 0 && args[idx + 1]) return String(args[idx + 1]).trim();
  return null;
};

const normalizeReleaseType = value => {
  if (!value) return null;
  const v = String(value).trim().toUpperCase();
  if (v === 'APK' || v === 'OTA') return v;
  return null;
};

const getChangedFiles = mode => {
  try {
    const command = mode === 'staged'
      ? 'git diff --name-only --cached'
      : 'git diff --name-only';

    const output = execSync(command, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    return output
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
  } catch (error) {
    console.error('[release-type-check] Failed to read changed files from git.');
    console.error('[release-type-check] Ensure this command is run inside a git repository.');
    process.exit(2);
  }
};

const isMobileImpactFile = name =>
  name.startsWith('mobile/') ||
  name === 'app.json' ||
  name === 'mobile/app.json' ||
  name === 'eas.json';

const isNativeOrConfigFile = name =>
  name === 'app.json' ||
  name === 'mobile/app.json' ||
  name === 'eas.json' ||
  name === 'mobile/package.json' ||
  name.startsWith('mobile/android/') ||
  name.startsWith('mobile/ios/');

const printFiles = files => {
  if (files.length === 0) {
    console.log('  (none)');
    return;
  }
  files.forEach(file => console.log(`  - ${file}`));
};

const mode = getArgValue('--mode') || process.env.RELEASE_CHECK_MODE || 'working';
const normalizedMode = mode === 'staged' ? 'staged' : 'working';

const declaredReleaseType = normalizeReleaseType(
  getArgValue('--type') || process.env.RELEASE_TYPE || process.env.RELEASETYPE
);

const changedFiles = getChangedFiles(normalizedMode);
const mobileImpactFiles = changedFiles.filter(isMobileImpactFile);
const nativeOrConfigFiles = changedFiles.filter(isNativeOrConfigFile);

const hasMobileImpact = mobileImpactFiles.length > 0;
const hasNativeOrConfigImpact = nativeOrConfigFiles.length > 0;
const suggestedType = !hasMobileImpact ? null : (hasNativeOrConfigImpact ? 'APK' : 'OTA');

console.log(`[release-type-check] Mode: ${normalizedMode}`);
console.log(`[release-type-check] Changed files: ${changedFiles.length}`);

if (!hasMobileImpact) {
  console.log('[release-type-check] PASS: No mobile-impact changes detected. Release-Type is not required.');
  process.exit(0);
}

console.log('[release-type-check] Mobile-impact files:');
printFiles(mobileImpactFiles);
console.log(`[release-type-check] Suggested Release-Type: ${suggestedType}`);

if (!declaredReleaseType) {
  console.error('[release-type-check] FAIL: Mobile-impact changes detected but no Release-Type was provided.');
  console.error('[release-type-check] Provide one of: APK or OTA');
  console.error(`[release-type-check] Example: npm run check:release-type -- --type=${suggestedType}`);
  process.exit(1);
}

console.log(`[release-type-check] Declared Release-Type: ${declaredReleaseType}`);

if (declaredReleaseType === 'OTA' && hasNativeOrConfigImpact) {
  console.error('[release-type-check] FAIL: OTA is invalid because native/config files changed.');
  console.error('[release-type-check] Native/config impact files:');
  printFiles(nativeOrConfigFiles);
  console.error('[release-type-check] Use --type=APK for this change set.');
  process.exit(1);
}

console.log('[release-type-check] PASS: Release-Type declaration is valid for changed files.');
process.exit(0);
