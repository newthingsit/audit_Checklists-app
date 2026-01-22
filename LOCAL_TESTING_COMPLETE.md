# ✅ Local Testing Setup - Complete

## 🎉 What's Fixed

1. ✅ **Backend syntax error FIXED** - `escalationWorkflows.js` now has correct structure
2. ✅ **Mobile API config updated** - `app.json` configured with your local IP: `172.16.2.35`
3. ✅ **Backend should start successfully** now

---

## 🚀 Quick Test Steps

### Step 1: Start Backend ✅

**Terminal 1:**
```powershell
cd D:\audit_Checklists-app\backend
npm start
```

**Wait for:**
```
Server running on port 5000
Local access: http://localhost:5000
```

**✅ Backend is ready!**

---

### Step 2: Start Expo (Mobile) 📱

**Terminal 2 (NEW terminal):**
```powershell
cd D:\audit_Checklists-app\mobile
npm start
```

**Expected:**
```
› Metro waiting on expo://172.16.2.35:8081
› Scan the QR code above with Expo Go
```

---

### Step 3: Start Web App (Optional) 🌐

**Terminal 3 (NEW terminal):**
```powershell
cd D:\audit_Checklists-app\web
npm start
```

**Opens:** http://localhost:3000

---

## 🧪 Test CORS

### Test 1: Web App (Browser)

1. **Open:** http://localhost:3000/login
2. **Press F12** → Console tab
3. **Paste this test:**

```javascript
fetch('http://localhost:5000/api/auth/login', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type,Authorization'
  }
}).then(r => {
  console.log('✅ Status:', r.status);
  console.log('✅ CORS Headers:', {
    'Origin': r.headers.get('Access-Control-Allow-Origin'),
    'Methods': r.headers.get('Access-Control-Allow-Methods'),
    'Credentials': r.headers.get('Access-Control-Allow-Credentials')
  });
});
```

**Expected:** Status 204 with CORS headers ✅

### Test 2: Mobile App (Expo)

1. **Scan QR code** with Expo Go app
2. **Navigate to Login**
3. **Enter credentials and sign in**
4. **Check backend terminal** - should see `✅ OPTIONS preflight handled`

---

## ✅ Success Indicators

### Backend Terminal:
```
✅ OPTIONS preflight handled: { 
  origin: 'http://localhost:3000' (or null for mobile),
  path: '/api/auth/login',
  timestamp: '...'
}
```

### Browser/App:
- ✅ Login works
- ✅ No CORS errors
- ✅ User authenticated

---

## 📝 Configuration Summary

### Backend:
- **Port:** 5000
- **URL:** http://localhost:5000/api
- **CORS:** Configured for localhost:3000 and your IP

### Mobile App:
- **Development API:** http://172.16.2.35:5000/api (your local IP)
- **Production API:** Azure backend URL
- **Auto-switches** based on `__DEV__` mode

### Web App:
- **Port:** 3000
- **API:** http://localhost:5000/api (via proxy in package.json)

---

## 🎯 Next Steps

After local testing succeeds:

1. ✅ **Commit changes:**
   ```powershell
   git add backend/utils/escalationWorkflows.js backend/server.js backend/web.config mobile/app.json
   git commit -m "fix: Backend syntax error and CORS configuration for local testing"
   git push origin master
   ```

2. ✅ **Deploy to Azure** (GitHub Actions will auto-deploy)

3. ✅ **Disable Azure CORS settings** (critical!)
   - Azure Portal → App Service → CORS
   - Remove all origins
   - Save and restart

4. ✅ **Test in production**

---

## 🆘 Quick Troubleshooting

### Backend won't start?
- ✅ Syntax error is fixed - should start now
- Check database connection in `.env`

### Mobile can't connect?
- Verify IP: `172.16.2.35` (already configured)
- Make sure device and computer on same WiFi
- Check firewall allows port 5000

### Web can't connect?
- Backend should be on port 5000
- Check proxy in `web/package.json` (should be `http://localhost:5000`)

---

**Ready to test!** Start backend, then start Expo/web, and test login! 🚀
