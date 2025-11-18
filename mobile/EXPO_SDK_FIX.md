# Expo SDK Version Fix

## Issue
The Expo Go app on your device is for SDK 54.0.0, but the project was detected as using SDK 49.

## Solution

### Option 1: Clear Cache and Reinstall (Recommended)
```bash
cd mobile
rm -rf node_modules
rm package-lock.json
npm install
npx expo start --clear
```

### Option 2: Update app.json
The `app.json` has been updated to explicitly specify SDK 54.0.0.

### Option 3: Use iOS Simulator
If you're on iOS, you can use the iOS Simulator instead:
```bash
cd mobile
npx expo start --ios
```

### Option 4: Use Development Build
Create a development build that matches your SDK version:
```bash
cd mobile
npx expo install --fix
npx expo prebuild
```

## Verification
After fixing, verify the SDK version:
```bash
cd mobile
npx expo --version
```

The project should now work with Expo Go SDK 54.0.0.

