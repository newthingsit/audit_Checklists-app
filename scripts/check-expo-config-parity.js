const fs = require('fs');
const path = require('path');

const rootPath = path.resolve(__dirname, '..');
const rootConfigPath = path.join(rootPath, 'app.json');
const mobileConfigPath = path.join(rootPath, 'mobile', 'app.json');

const readJson = filePath => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[expo-config-parity] Failed to read ${filePath}:`, error.message);
    process.exit(2);
  }
};

const stableStringify = value => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const normalizePermissions = permissions => {
  if (!Array.isArray(permissions)) return permissions;
  return [...permissions].sort();
};

const getComparableConfig = json => {
  const expo = json?.expo || {};

  return {
    version: expo.version,
    runtimeVersion: expo.runtimeVersion,
    updatesUrl: expo.updates?.url,
    android: {
      package: expo.android?.package,
      versionCode: expo.android?.versionCode,
      permissions: normalizePermissions(expo.android?.permissions)
    },
    ios: {
      bundleIdentifier: expo.ios?.bundleIdentifier
    },
    extra: {
      eas: {
        projectId: expo.extra?.eas?.projectId
      },
      apiUrl: expo.extra?.apiUrl
    }
  };
};

const rootJson = readJson(rootConfigPath);
const mobileJson = readJson(mobileConfigPath);

const rootComparable = getComparableConfig(rootJson);
const mobileComparable = getComparableConfig(mobileJson);

const rootSerialized = stableStringify(rootComparable);
const mobileSerialized = stableStringify(mobileComparable);

if (rootSerialized === mobileSerialized) {
  console.log('[expo-config-parity] PASS: app.json and mobile/app.json are aligned for release-critical fields.');
  process.exit(0);
}

const mismatches = [];

const compareField = (fieldName, left, right) => {
  if (stableStringify(left) !== stableStringify(right)) {
    mismatches.push({ fieldName, rootValue: left, mobileValue: right });
  }
};

compareField('expo.version', rootComparable.version, mobileComparable.version);
compareField('expo.runtimeVersion', rootComparable.runtimeVersion, mobileComparable.runtimeVersion);
compareField('expo.updates.url', rootComparable.updatesUrl, mobileComparable.updatesUrl);
compareField('expo.android.package', rootComparable.android.package, mobileComparable.android.package);
compareField('expo.android.versionCode', rootComparable.android.versionCode, mobileComparable.android.versionCode);
compareField('expo.android.permissions', rootComparable.android.permissions, mobileComparable.android.permissions);
compareField('expo.ios.bundleIdentifier', rootComparable.ios.bundleIdentifier, mobileComparable.ios.bundleIdentifier);
compareField('expo.extra.eas.projectId', rootComparable.extra.eas.projectId, mobileComparable.extra.eas.projectId);
compareField('expo.extra.apiUrl', rootComparable.extra.apiUrl, mobileComparable.extra.apiUrl);

console.error('[expo-config-parity] FAIL: app.json and mobile/app.json are out of sync.');
console.error('[expo-config-parity] Mismatches:');
for (const mismatch of mismatches) {
  console.error(`  - ${mismatch.fieldName}`);
  console.error(`    root:   ${JSON.stringify(mismatch.rootValue)}`);
  console.error(`    mobile: ${JSON.stringify(mismatch.mobileValue)}`);
}

console.error('[expo-config-parity] Fix by aligning release-critical fields between both files.');
process.exit(1);
