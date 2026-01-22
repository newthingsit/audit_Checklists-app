# 📱 Expo Local Testing - Complete Guide

## ✅ What's Ready

1. ✅ Backend syntax error **FIXED**
2. ✅ `app.json` updated with your local IP: **172.16.2.35**
3. ✅ API config will use local backend in development mode

---

## 🚀 Quick Start (3 Steps)

### Step 1: Start Backend

```powershell
cd D:\audit_Checklists-app\backend
npm start
```

**Wait for:** `Server running on port 5000` ✅

**Keep this terminal open!**

---

### Step 2: Start Expo

**Open NEW terminal:**

```powershell
cd D:\audit_Checklists-app\mobile
npm start
```

**Or:**
```powershell
npx expo start
```

**Expected output:**
```
› Metro waiting on expo://172.16.2.35:8081
› Scan the QR code above with Expo Go
```

---

### Step 3: Run on Device

#### Option A: Physical Device (Recommended)

1. **Install Expo Go:**
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Scan QR Code:**
   - Android: Open Expo Go → Scan QR code
   - iOS: Open Camera → Scan QR code → Tap notification

3. **App loads** ✅

#### Option B: Android Emulator

1. **Press `a`** in Expo terminal
2. **Wait for emulator** to start (first time: 2-3 minutes)
3. **App loads automatically** ✅

**Note:** For Android emulator, you may need to change API URL to `http://10.0.2.2:5000/api` (see troubleshooting)

#### Option C: iOS Simulator (Mac only)

1. **Press `i`** in Expo terminal
2. **Wait for simulator** to start
3. **App loads automatically** ✅

---

## 🧪 Test CORS

### Test 1: Login

1. **Open app** on device/emulator
2. **Navigate to Login**
3. **Enter credentials:**
   - Email: `admin@lbf.co.in`
   - Password: `Admin123@`
4. **Tap "Sign In"**

### Test 2: Check Backend Logs

**In backend terminal, you should see:**

```
✅ OPTIONS preflight handled: { 
  origin: null,  // Mobile apps don't send Origin header
  path: '/api/auth/login',
  timestamp: '...'
}
```

**If you see this → CORS is working! ✅**

### Test 3: Check for Errors

**In Expo terminal or device logs:**
- Should see **NO CORS errors**
- Should see **NO "Network request failed"** errors
- Login should **succeed**

---

## 🆘 Troubleshooting

### Issue: "Network request failed"

**For Physical Device:**
1. **Check IP address:**
   - Your IP: `172.16.2.35` (already configured)
   - Make sure device and computer are on **same WiFi network**

2. **Check firewall:**
   - Windows Firewall might block port 5000
   - Allow Node.js through firewall

3. **Test backend from device:**
   - Open browser on device
   - Go to: `http://172.16.2.35:5000/api/health`
   - Should return: `{"status":"OK","message":"Server is running"}`

**For Android Emulator:**
- Change API URL in `app.json` to: `"http://10.0.2.2:5000/api"`
- Android emulator uses special IP `10.0.2.2` to access host machine

**For iOS Simulator:**
- Can use `"http://localhost:5000/api"` (same machine)

### Issue: Can't connect to backend

**Quick Test:**
```powershell
# Test from your computer
curl http://172.16.2.35:5000/api/health
```

**Should return:** `{"status":"OK","message":"Server is running"}`

**If this fails:**
- Backend might not be listening on all interfaces
- Check `server.js` line 636: should be `app.listen(PORT, '0.0.0.0', ...)`

### Issue: Backend syntax error

**Already fixed!** But if you see errors:
1. Check `backend/utils/escalationWorkflows.js` line 306
2. Should have proper indentation
3. Restart backend: `npm start`

---

## 📝 API URL Configuration

### Current Setup (app.json):

```json
"apiUrl": {
  "development": "http://172.16.2.35:5000/api",  // Your local IP
  "production": "https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api"
}
```

### For Different Scenarios:

| Scenario | Development URL |
|----------|----------------|
| **Physical Device** | `http://172.16.2.35:5000/api` ✅ (already set) |
| **Android Emulator** | `http://10.0.2.2:5000/api` |
| **iOS Simulator** | `http://localhost:5000/api` |

**To change for Android emulator:**
```json
"development": "http://10.0.2.2:5000/api"
```

---

## ✅ Success Checklist

After testing:

- [ ] Backend running on port 5000
- [ ] Backend shows "Server running" message
- [ ] Expo dev server running
- [ ] App loaded on device/emulator
- [ ] Login works without errors
- [ ] Backend logs show `✅ OPTIONS preflight handled`
- [ ] No CORS errors in logs

---

## 🎯 Expected Results

### ✅ Working:

1. **Backend:**
   - Shows `Server running on port 5000`
   - Shows `✅ OPTIONS preflight handled` when login attempted

2. **Mobile App:**
   - Login works
   - No network errors
   - User authenticated successfully

3. **No Errors:**
   - No CORS errors
   - No "Network request failed"
   - No connection errors

---

## 🔄 After Testing

### If Tests Pass:

1. ✅ CORS fix works locally
2. ✅ Ready to deploy to Azure
3. ✅ After deployment, disable Azure CORS settings
4. ✅ Change `app.json` back to production URL (optional - it will use production in production builds)

### To Revert app.json (Optional):

After testing, you can change development URL back to production if you want:

```json
"development": "https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api"
```

**But it's fine to leave it as is** - production builds use the production URL automatically.

---

## 📞 Quick Commands Reference

### Start Backend:
```powershell
cd D:\audit_Checklists-app\backend
npm start
```

### Start Expo:
```powershell
cd D:\audit_Checklists-app\mobile
npm start
```

### Test Backend Health:
```powershell
curl http://172.16.2.35:5000/api/health
```

### Find Your IP (if it changes):
```powershell
ipconfig | Select-String "IPv4"
```

---

**Your local IP:** `172.16.2.35` ✅ (already configured in app.json)

**Ready to test!** Start backend, then start Expo, then scan QR code! 🚀
