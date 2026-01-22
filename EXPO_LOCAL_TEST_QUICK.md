# ⚡ Quick Expo Local Test - 5 Minutes

## 🎯 Goal
Test CORS fix with Expo mobile app running locally.

---

## 🚀 Step 1: Fix Backend Syntax Error (Already Fixed!)

The syntax error in `escalationWorkflows.js` has been fixed. Restart backend:

```powershell
# In backend terminal, press Ctrl+C to stop, then:
npm start
```

**Wait for:** `Server running on port 5000` ✅

---

## 📱 Step 2: Update Mobile API Config for Local Testing

### Option A: Quick Test (Temporary Change)

**Edit:** `mobile/src/config/api.js`

**Change line 38 from:**
```javascript
return 'https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api';
```

**To (for physical device):**
```javascript
// Get your local IP first: ipconfig (look for IPv4 Address, e.g., 192.168.1.100)
return 'http://192.168.1.100:5000/api';  // Replace with YOUR computer's IP
```

**Or (for Android emulator):**
```javascript
return 'http://10.0.2.2:5000/api';  // Android emulator special IP
```

**Or (for iOS simulator - Mac only):**
```javascript
return 'http://localhost:5000/api';  // iOS simulator can use localhost
```

### Option B: Use app.json Configuration (Better)

**Edit:** `mobile/app.json` (or `app.config.js`)

Add this to the `extra` section:
```json
{
  "expo": {
    "extra": {
      "apiUrl": {
        "development": "http://192.168.1.100:5000/api",  // Your local IP
        "production": "https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api"
      }
    }
  }
}
```

**Then the code will automatically use the development URL!**

---

## 📱 Step 3: Find Your Local IP Address

**In PowerShell:**
```powershell
ipconfig
```

**Look for:**
```
IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

**Use this IP in the API config!**

---

## 📱 Step 4: Start Expo

### Terminal 2: Mobile App

```powershell
cd D:\audit_Checklists-app\mobile
npm start
```

**Or:**
```powershell
npx expo start
```

**Expected:**
```
› Metro waiting on expo://192.168.1.100:8081
› Scan the QR code above with Expo Go
```

---

## 📱 Step 5: Run on Device

### Physical Device:
1. **Install Expo Go** app on your phone
2. **Scan QR code** from terminal
3. **App loads** ✅

### Android Emulator:
1. **Press `a`** in Expo terminal
2. **Wait for emulator** to start
3. **App loads** ✅

### iOS Simulator (Mac only):
1. **Press `i`** in Expo terminal
2. **Wait for simulator** to start
3. **App loads** ✅

---

## 🧪 Step 6: Test Login

1. **Open app** on device/emulator
2. **Go to Login screen**
3. **Enter credentials:**
   - Email: `admin@lbf.co.in`
   - Password: `Admin123@`
4. **Tap "Sign In"**

### Check Results:

**✅ Success:**
- Login works
- No errors
- User authenticated

**❌ Failure:**
- "Network request failed"
- Can't connect to backend
- Check API URL in config

---

## 🔍 Step 7: Check Backend Logs

**In Terminal 1 (backend), you should see:**

```
✅ OPTIONS preflight handled: { 
  origin: null,  // Mobile apps don't send Origin
  path: '/api/auth/login',
  timestamp: '...'
}
```

**If you see this → CORS is working! ✅**

---

## 🆘 Quick Troubleshooting

### "Network request failed"

**Causes:**
1. Wrong IP address in API config
2. Backend not running
3. Firewall blocking port 5000
4. Device and computer on different WiFi

**Fix:**
1. Verify backend: `curl http://localhost:5000/api/health`
2. Check IP: Run `ipconfig` and use correct IPv4 address
3. Make sure device and computer are on **same WiFi network**
4. For Android emulator: Use `10.0.2.2` instead of localhost

### Can't find IP address

**PowerShell:**
```powershell
ipconfig | findstr IPv4
```

**Look for:** `192.168.x.x` or `10.0.x.x`

---

## ✅ Success Checklist

- [ ] Backend running on port 5000
- [ ] API config updated with correct IP
- [ ] Expo dev server running
- [ ] App loaded on device/emulator
- [ ] Login works
- [ ] Backend logs show OPTIONS preflight handled

---

## 📝 Quick Reference

### API URLs for Different Scenarios:

| Scenario | API URL |
|----------|---------|
| **Physical Device** | `http://YOUR_IP:5000/api` (e.g., `http://192.168.1.100:5000/api`) |
| **Android Emulator** | `http://10.0.2.2:5000/api` |
| **iOS Simulator** | `http://localhost:5000/api` |
| **Production** | `https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api` |

### Find Your IP:
```powershell
ipconfig | findstr IPv4
```

---

## 🎉 Success!

If login works locally:
1. ✅ CORS fix is working
2. ✅ Ready to deploy to Azure
3. ✅ After deployment, disable Azure CORS settings
4. ✅ Change API config back to production URL

---

**Remember:** 
- Physical devices need your computer's IP (not `localhost`)
- Android emulator needs `10.0.2.2`
- iOS simulator can use `localhost`
