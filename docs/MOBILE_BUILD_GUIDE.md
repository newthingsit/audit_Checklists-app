# 📱 Mobile App Build & Deployment Guide

This guide will help you build and deploy the Audit Pro mobile app to the App Store and Google Play Store.

## 📋 Prerequisites

1. **Expo Account** - [Create free account](https://expo.dev/signup)
2. **EAS CLI** - `npm install -g eas-cli`
3. **Apple Developer Account** - $99/year for iOS
4. **Google Play Console Account** - $25 one-time for Android

---

## 🔧 Initial Setup

### Step 1: Login to Expo
```bash
cd mobile
eas login
```

### Step 2: Configure Project
```bash
# Initialize EAS for your project
eas build:configure
```

### Step 3: Update Configuration

Edit `mobile/app.json` and update these values:
- `expo.extra.eas.projectId` - Your EAS project ID
- `expo.owner` - Your Expo username
- `expo.extra.apiUrl.production` - Your Azure backend URL

---

## 🏗️ Building the App

### Build for Android (APK for testing)
```bash
cd mobile
eas build --platform android --profile preview
```

### Build for Android (AAB for Play Store)
```bash
cd mobile
eas build --platform android --profile production
```

### Build for iOS
```bash
cd mobile
eas build --platform ios --profile production
```

### Build for Both Platforms
```bash
cd mobile
eas build --platform all --profile production
```

---

## 📲 Installing Test Builds

### Android
1. Build completes → Download APK from Expo dashboard
2. Transfer APK to device
3. Enable "Install from unknown sources"
4. Install APK

### iOS (TestFlight)
1. Build completes on Expo
2. Submit to App Store Connect
3. Install via TestFlight app

---

## 🚀 Publishing to App Stores

### Google Play Store

#### Step 1: Create App in Play Console
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Fill in app details, content rating, etc.

#### Step 2: Create Service Account for EAS
1. Go to Google Cloud Console
2. Create service account with "Service Account User" role
3. Download JSON key
4. Save as `mobile/google-service-account.json`
5. Grant access in Play Console → Users & Permissions

#### Step 3: Submit via EAS
```bash
eas submit --platform android --profile production
```

### Apple App Store

#### Step 1: Create App in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app
3. Fill in app details

#### Step 2: Configure EAS Submit
Update `mobile/eas.json`:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-id-from-app-store-connect",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

#### Step 3: Submit via EAS
```bash
eas submit --platform ios --profile production
```

---

## 🔄 Over-the-Air Updates

After initial app store release, you can push JavaScript updates without going through app review:

```bash
# Push update to production channel
eas update --branch production --message "Bug fix for v1.12.1"

# Push update to preview channel (for testing)
eas update --branch preview --message "Testing new feature"
```

---

## 📁 Required Assets

Create these assets in `mobile/assets/`:

| File | Size | Description |
|------|------|-------------|
| `icon.png` | 1024x1024 | App icon (square) |
| `splash.png` | 1284x2778 | Splash screen |
| `adaptive-icon.png` | 1024x1024 | Android adaptive icon foreground |
| `notification-icon.png` | 96x96 | Android notification icon (white on transparent) |

### Icon Generator
Use [Expo Icon Builder](https://buildicon.netlify.app/) or [App Icon Generator](https://appicon.co/)

---

## ⚙️ Environment Configuration

### Development
```bash
# Start local development
npx expo start
```

### Preview (Internal Testing)
```bash
# Build preview APK
eas build --platform android --profile preview
```

### Production
```bash
# Build production bundles
eas build --platform all --profile production
```

---

## 📝 App Store Requirements

### Android (Google Play)
- [ ] App icon (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots (min 2, max 8)
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Privacy policy URL
- [ ] Content rating questionnaire

### iOS (App Store)
- [ ] App icon (1024x1024 PNG, no alpha)
- [ ] Screenshots for each device size
- [ ] App description
- [ ] Keywords
- [ ] Support URL
- [ ] Privacy policy URL
- [ ] App Review information

---

## 🔐 Security Checklist

- [ ] Remove all console.log statements
- [ ] Ensure production API URL is correct
- [ ] Test biometric authentication
- [ ] Verify secure storage is working
- [ ] Test offline mode
- [ ] Verify push notifications

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
eas build --platform android --profile production --clear-cache
```

### iOS Signing Issues
```bash
# Reset credentials
eas credentials --platform ios
```

### Android Keystore Issues
```bash
# Generate new keystore
eas credentials --platform android
```

---

## 📊 Build Profiles Summary

| Profile | Use Case | Android Output | iOS Output |
|---------|----------|----------------|------------|
| `development` | Development client | APK | Simulator build |
| `preview` | Internal testing | APK | Ad-hoc IPA |
| `production` | App store release | AAB | App Store IPA |

---

## 🔗 Useful Links

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [EAS Update Docs](https://docs.expo.dev/eas-update/introduction/)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)

---

## 💡 Tips

1. **Start with Android** - Faster builds, easier testing
2. **Use Preview for Testing** - Share APK with team before production
3. **Automate with GitHub Actions** - Set up CI/CD for builds
4. **Monitor with Sentry** - Add error tracking for production
5. **Use OTA Updates** - Fix bugs quickly without app review

