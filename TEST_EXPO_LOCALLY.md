# 📱 Test CORS Fix on Expo (Mobile App) Locally

## 🎯 Goal
Test the CORS fix works with the mobile app (Expo) running locally.

---

## 📋 Prerequisites

- Node.js installed
- Expo CLI installed (`npm install -g expo-cli` or use `npx expo`)
- Backend server running locally (port 5000)
- Mobile device with Expo Go app OR Android/iOS emulator

---

## 🚀 Step 1: Start Backend Server

### Terminal 1: Backend

```powershell
cd D:\audit_Checklists-app\backend
npm start
```

**Wait for:** `Server running on port 5000` ✅

**Keep this terminal open!**

---

## 📱 Step 2: Configure Mobile App API URL

### 2.1 Check API Configuration

Open: `mobile/src/config/api.js`

**Should look like:**
```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000/api'  // Local development
  : 'https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api'; // Production
```

**For local testing, make sure:**
- `__DEV__` is `true` (development mode)
- API URL points to `http://localhost:5000/api`

### 2.2 For Physical Device Testing

**If testing on a physical device (not emulator):**

You need to use your computer's local IP address instead of `localhost`:

1. **Find your local IP:**
   ```powershell
   ipconfig
   ```
   Look for **IPv4 Address** (e.g., `192.168.1.100`)

2. **Update API config:**
   ```javascript
   const API_BASE_URL = __DEV__ 
     ? 'http://192.168.1.100:5000/api'  // Use your actual IP
     : 'https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api';
   ```

3. **Make sure backend allows connections from your network:**
   - Backend should be listening on `0.0.0.0` (already configured in `server.js`)
   - Firewall should allow port 5000

---

## 📱 Step 3: Start Expo Development Server

### Terminal 2: Mobile App

```powershell
cd D:\audit_Checklists-app\mobile
npm start
```

**Or if you have Expo CLI:**
```powershell
npx expo start
```

**Expected Output:**
```
› Metro waiting on expo://192.168.1.100:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
```

---

## 📱 Step 4: Run on Device/Emulator

### Option A: Physical Device (Recommended for CORS Testing)

1. **Install Expo Go app:**
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Scan QR Code:**
   - Android: Open Expo Go app → Scan QR code
   - iOS: Open Camera app → Scan QR code → Tap notification

3. **App loads on your device** ✅

### Option B: Android Emulator

1. **Press `a` in Expo terminal** to open Android emulator
2. **Wait for emulator to start** (first time takes a few minutes)
3. **App loads automatically** ✅

### Option C: iOS Simulator (Mac only)

1. **Press `i` in Expo terminal** to open iOS simulator
2. **Wait for simulator to start**
3. **App loads automatically** ✅

---

## 🧪 Step 5: Test CORS with Mobile App

### 5.1 Test Login

1. **Open the app** on your device/emulator
2. **Navigate to Login screen**
3. **Enter credentials:**
   - Email: `admin@lbf.co.in` (or your test user)
   - Password: `Admin123@` (or your test password)
4. **Tap "Sign In"**

### 5.2 Check for CORS Errors

**On Physical Device:**
- Check Expo terminal for errors
- Look for network errors or CORS errors

**On Emulator/Simulator:**
- Check Expo terminal
- Check device logs (Android: `adb logcat`, iOS: Xcode console)

### 5.3 Expected Results

**✅ Success:**
- Login works
- No CORS errors in logs
- User is authenticated
- App navigates to dashboard/home

**❌ Failure:**
- CORS errors in logs
- "Network request failed" errors
- Login fails

---

## 🔍 Step 6: Check Backend Logs

**In Terminal 1 (backend), you should see:**

```
✅ OPTIONS preflight handled: { 
  origin: null,  // Mobile apps don't send Origin header
  originInList: false,
  path: '/api/auth/login',
  timestamp: '...'
}
```

**Note:** Mobile apps typically don't send an `Origin` header, so `origin` will be `null`. This is normal and the CORS handler should still work.

---

## 🧪 Step 7: Test OPTIONS Request (Optional)

### Using curl (from your computer)

```powershell
# Test preflight from mobile app perspective (no Origin header)
curl -X OPTIONS http://localhost:5000/api/auth/login `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: Content-Type,Authorization" `
  -v
```

**Expected:**
- Status: **204**
- `Access-Control-Allow-Origin: *` (since no Origin header)

---

## 🆘 Troubleshooting

### Issue: "Network request failed"

**Causes:**
1. Backend not running
2. Wrong API URL in mobile config
3. Firewall blocking port 5000
4. Using `localhost` on physical device (use IP address instead)

**Solutions:**
1. Verify backend is running: `curl http://localhost:5000/api/health`
2. Check API URL in `mobile/src/config/api.js`
3. For physical device: Use your computer's IP address, not `localhost`
4. Check firewall allows port 5000

### Issue: CORS errors on mobile

**Mobile apps don't send Origin headers**, so CORS should work automatically. If you see CORS errors:

1. **Check backend logs** - should show OPTIONS preflight handled
2. **Verify OPTIONS handler** is first middleware in `server.js`
3. **Check API URL** is correct in mobile config

### Issue: Can't connect to backend

**For Physical Device:**
- Make sure device and computer are on **same WiFi network**
- Use computer's **local IP address** (not `localhost`)
- Backend must be listening on `0.0.0.0` (already configured)

**For Emulator:**
- Android emulator: Use `10.0.2.2` instead of `localhost`
- iOS simulator: Use `localhost` (works on same machine)

**Update API config for Android emulator:**
```javascript
const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'android' 
    ? 'http://10.0.2.2:5000/api'  // Android emulator
    : 'http://localhost:5000/api'  // iOS simulator
  : 'https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api';
```

---

## ✅ Success Checklist

After testing:

- [ ] Backend running on port 5000
- [ ] Expo dev server running
- [ ] App loaded on device/emulator
- [ ] Login works without errors
- [ ] No CORS errors in logs
- [ ] Backend logs show OPTIONS preflight handled
- [ ] User can navigate app successfully

---

## 📝 Quick Test Commands

### Test 1: Backend Health
```powershell
curl http://localhost:5000/api/health
```
**Expected:** `{"status":"OK","message":"Server is running"}`

### Test 2: OPTIONS Preflight (No Origin - Mobile)
```powershell
curl -X OPTIONS http://localhost:5000/api/auth/login -v
```
**Expected:** 204 with `Access-Control-Allow-Origin: *`

### Test 3: OPTIONS Preflight (With Origin - Web)
```powershell
curl -X OPTIONS http://localhost:5000/api/auth/login `
  -H "Origin: http://localhost:3000" -v
```
**Expected:** 204 with `Access-Control-Allow-Origin: http://localhost:3000`

---

## 🎯 Expected Behavior

### ✅ Working Correctly:

1. **Mobile App:**
   - Login works
   - No network errors
   - No CORS errors
   - Backend logs show OPTIONS handled

2. **Backend Logs:**
   - Shows `✅ OPTIONS preflight handled`
   - Shows login attempts
   - No errors

### ❌ Not Working:

1. **Mobile App:**
   - "Network request failed" errors
   - CORS errors (unlikely on mobile)
   - Login fails

2. **Backend Logs:**
   - No OPTIONS preflight messages
   - Connection errors
   - Database errors

---

## 🎉 Success!

If all tests pass:
1. ✅ CORS fix works locally
2. ✅ Mobile app can connect to backend
3. ✅ Ready to deploy to Azure
4. ✅ After deployment, disable Azure CORS settings

---

## 📞 Next Steps

After local testing succeeds:
1. Commit and push changes
2. Deploy to Azure
3. **Disable Azure CORS settings** (critical!)
4. Update mobile app API URL to production
5. Test in production

---

**Remember:** 
- Physical devices need your computer's IP address (not `localhost`)
- Android emulator needs `10.0.2.2` instead of `localhost`
- iOS simulator can use `localhost` (same machine)
