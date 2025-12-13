# 📱 Expo Deployment Guide - APK & iOS

## ✅ Version Updated
- **App Version:** 2.1.1 → **2.1.2**
- **iOS Build Number:** 2 → **3**
- **Android Version Code:** 4 → **5**

## 🚀 Deployment Steps

### Step 1: Install EAS CLI (if not already installed)
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```

### Step 3: Publish Update (For Expo Go / OTA Updates)
This will make the update available to users with Expo Go or apps with OTA updates enabled:

```bash
cd mobile
eas update --branch production --message "v2.1.2: Schedule Adherence, Same-day validation, Individual rescheduling"
```

**For Preview/Development:**
```bash
eas update --branch preview --message "v2.1.2: Preview build with new features"
```

### Step 4: Build APK (Android)
```bash
cd mobile
eas build --platform android --profile production
```

**For Preview APK:**
```bash
eas build --platform android --profile preview
```

### Step 5: Build iOS
```bash
cd mobile
eas build --platform ios --profile production
```

**For iOS Simulator:**
```bash
eas build --platform ios --profile preview
```

### Step 6: Build Both Platforms at Once
```bash
cd mobile
eas build --platform all --profile production
```

---

## 📋 Quick Commands

### Publish Update Only (No Build)
```bash
cd mobile
eas update --branch production --message "v2.1.2: New features"
```

### Build APK Only
```bash
cd mobile
eas build --platform android --profile production
```

### Build iOS Only
```bash
cd mobile
eas build --platform ios --profile production
```

### Build Both + Publish Update
```bash
cd mobile
# First publish update
eas update --branch production --message "v2.1.2: Schedule Adherence and validation features"

# Then build both platforms
eas build --platform all --profile production
```

---

## 🔍 Check Build Status

After starting a build, you can:
1. Check status in terminal
2. Visit: https://expo.dev/accounts/kapilchauhan/projects/audit-pro/builds
3. Use command: `eas build:list`

---

## 📥 Download Builds

Once builds complete:
1. Visit Expo dashboard: https://expo.dev
2. Navigate to your project → Builds
3. Download APK/IPA files
4. Or use: `eas build:download` (follow prompts)

---

## 🎯 What's New in v2.1.2

- ✅ Schedule Adherence card in dashboard
- ✅ Same-day validation for scheduled audits
- ✅ Individual checklist rescheduling (2 times limit)
- ✅ Backdated rescheduling support
- ✅ Improved error messages
- ✅ Rate limit fixes

---

## ⚠️ Important Notes

1. **Expo Go:** Updates published via `eas update` will be available in Expo Go app
2. **Standalone Apps:** Need to rebuild APK/IPA files using `eas build`
3. **Build Time:** 
   - APK: ~10-15 minutes
   - iOS: ~15-20 minutes
4. **Credentials:** EAS will handle signing automatically (or use existing)

---

## 🐛 Troubleshooting

### Issue: "Not logged in"
```bash
eas login
```

### Issue: "Project not found"
Verify `app.json` has correct:
- `owner`: "kapilchauhan"
- `extra.eas.projectId`: "57d2046c-9e50-459f-8f41-006b79f6bca3"

### Issue: Build fails
- Check EAS dashboard for detailed logs
- Verify all dependencies are installed: `npm install`
- Check `eas.json` configuration

---

## ✅ Success Checklist

- [ ] Version updated to 2.1.2
- [ ] Build numbers incremented
- [ ] Update published (for Expo Go)
- [ ] APK built successfully
- [ ] iOS build completed
- [ ] Downloads available in Expo dashboard
- [ ] Tested on device

---

**Ready to deploy! Run the commands above to update Expo Go and build APK/iOS files.**

