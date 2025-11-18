# Clear Cache Instructions

## Issue
You're seeing errors about duplicate imports and deprecated ImagePicker API even though the code has been fixed. This is likely due to Metro bundler cache.

## Solution: Clear All Caches

### Step 1: Stop Expo
Press `Ctrl+C` in the terminal where Expo is running

### Step 2: Clear Expo Cache
```bash
cd mobile
npx expo start --clear
```

### Step 3: If That Doesn't Work - Full Clean
```bash
cd mobile

# Delete node_modules and cache
Remove-Item -Recurse -Force node_modules, .expo -ErrorAction SilentlyContinue

# Reinstall dependencies
npm install

# Start with cleared cache
npx expo start --clear
```

### Step 4: Reload App
- Shake your device → Reload
- Or press `r` in Expo terminal
- Or close and reopen Expo Go app completely

## What Was Fixed

1. ✅ **Duplicate Import** - Removed duplicate `themeConfig` import
2. ✅ **ImagePicker API** - Changed to `mediaTypes: ['images']` (correct format)
3. ✅ **Upload Endpoint** - Changed to `/api/photo` (correct endpoint)
4. ✅ **Permissions** - Added camera and photo library permissions to `app.json`

## After Clearing Cache

The app should:
- ✅ No duplicate import errors
- ✅ No deprecation warnings
- ✅ Photo upload should work
- ✅ No 404 errors

---

**Note:** Metro bundler sometimes caches old code. Always use `--clear` flag when you see unexpected errors after code changes.

