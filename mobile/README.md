# Mobile Application

React Native mobile application for Restaurant Audit & Checklist (Android & iOS).

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Expo CLI globally (if not already installed):
```bash
npm install -g expo-cli
```

3. Update API URL in `src/context/AuthContext.js`:
   - Android Emulator: `http://10.0.2.2:5000/api`
   - iOS Simulator: `http://localhost:5000/api`
   - Physical Device: `http://YOUR_COMPUTER_IP:5000/api`

4. Start Expo:
```bash
npm start
```

5. Run on device:
   - **Android**: Press `a` or scan QR code with Expo Go app
   - **iOS**: Press `i` or scan QR code with Camera app

## Features

- Native mobile experience
- Offline-capable (with AsyncStorage)
- Camera integration ready
- Push notifications ready
- Cross-platform (Android & iOS)

## Building Standalone Apps

### Android
```bash
expo build:android
```

### iOS
```bash
expo build:ios
```

Or use EAS Build:
```bash
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

## Notes

- Make sure your device and computer are on the same network for API access
- For production, update API URLs to your production backend
- Add app icons and splash screens in the `assets/` directory

