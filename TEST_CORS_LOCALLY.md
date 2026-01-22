# 🧪 Test CORS Fix Locally - Step-by-Step Guide

## ✅ Why Test Locally First?

Testing locally lets you verify the CORS fix works before deploying to Azure. This saves time and ensures the fix is correct.

---

## 📋 Prerequisites

- Node.js installed (v14 or higher)
- Backend dependencies installed
- Frontend dependencies installed
- Backend can connect to your database

---

## 🚀 Step 1: Start Backend Server

### 1.1 Navigate to Backend Folder

```powershell
cd D:\audit_Checklists-app\backend
```

### 1.2 Install Dependencies (if needed)

```powershell
npm install
```

### 1.3 Check Environment Variables

Make sure you have a `.env` file in the `backend` folder with:
- Database connection settings
- `NODE_ENV=development` (or leave unset for development mode)

### 1.4 Start Backend Server

```powershell
npm start
```

**Or if you have a dev script:**
```powershell
npm run dev
```

**Expected Output:**
```
Server running on port 5000
Access from network: http://YOUR_IP:5000
Local access: http://localhost:5000
```

**Keep this terminal window open!** ✅

---

## 🌐 Step 2: Start Frontend (Web App)

### 2.1 Open a NEW Terminal Window

Keep the backend running in the first terminal.

### 2.2 Navigate to Web Folder

```powershell
cd D:\audit_Checklists-app\web
```

### 2.3 Install Dependencies (if needed)

```powershell
npm install
```

### 2.4 Check API Configuration

Open `web/src/config/api.js` (or wherever your API config is) and make sure it points to local backend:

```javascript
// Should be something like:
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
```

### 2.5 Start Frontend Development Server

```powershell
npm start
```

**Expected Output:**
```
Compiled successfully!
You can now view web in the browser.
  Local:            http://localhost:3000
  On Your Network:  http://YOUR_IP:3000
```

**Browser should open automatically to http://localhost:3000** ✅

---

## 🧪 Step 3: Test CORS Preflight Request

### 3.1 Open Browser Developer Tools

1. In your browser (at http://localhost:3000), press **F12**
2. Go to **Console** tab

### 3.2 Test OPTIONS Request (Preflight)

**Paste this in the browser console:**

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
    'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': r.headers.get('Access-Control-Allow-Methods'),
    'Access-Control-Allow-Credentials': r.headers.get('Access-Control-Allow-Credentials'),
    'Access-Control-Allow-Headers': r.headers.get('Access-Control-Allow-Headers')
  });
  return r;
}).catch(e => {
  console.error('❌ Error:', e);
});
```

**Expected Result:**
```
✅ Status: 204
✅ CORS Headers: {
  Access-Control-Allow-Origin: "http://localhost:3000"
  Access-Control-Allow-Methods: "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  Access-Control-Allow-Credentials: "true"
  Access-Control-Allow-Headers: "Content-Type, Authorization, Cache-Control, X-Requested-With, Accept"
}
```

**If you see this → CORS is working! ✅**

**If you see an error → Check backend logs (see Step 4)**

---

## 🔐 Step 4: Test Login Locally

### 4.1 Go to Login Page

1. In browser, navigate to: **http://localhost:3000/login**
2. You should see the login form

### 4.2 Try to Log In

1. Enter your credentials:
   - Email: `admin@lbf.co.in` (or your test user)
   - Password: `Admin123@` (or your test password)

2. Click **Sign In**

3. **Watch the browser console (F12)** for any errors

### 4.3 Expected Results

**✅ Success:**
- Login works
- No CORS errors in console
- You're redirected to dashboard/home

**❌ Failure:**
- CORS errors in console
- Login fails
- Check backend logs (see below)

---

## 📊 Step 5: Check Backend Logs

### 5.1 Look at Backend Terminal

When you try to login, you should see in the backend terminal:

```
✅ OPTIONS preflight handled: { 
  origin: 'http://localhost:3000', 
  originInList: true,
  path: '/api/auth/login',
  timestamp: '2025-01-27T...'
}
```

**If you see this → OPTIONS handler is working! ✅**

**If you DON'T see this → OPTIONS requests aren't being handled**

### 5.2 Check for Errors

Look for any error messages in the backend terminal:
- Database connection errors
- Authentication errors
- CORS-related errors

---

## 🧪 Step 6: Test with curl (Alternative Method)

### 6.1 Test OPTIONS Request

**Open a NEW terminal (PowerShell or Command Prompt):**

```powershell
curl -X OPTIONS http://localhost:5000/api/auth/login `
  -H "Origin: http://localhost:3000" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: Content-Type,Authorization" `
  -v
```

**Expected Output:**
```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: http://localhost:3000
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
< Access-Control-Allow-Credentials: true
< Access-Control-Allow-Headers: Content-Type, Authorization, Cache-Control, X-Requested-With, Accept
```

**If you see these headers → CORS is working! ✅**

---

## ✅ Step 7: Verification Checklist

After testing, verify:

- [ ] Backend server is running on port 5000
- [ ] Frontend is running on port 3000
- [ ] OPTIONS request returns **204** status
- [ ] OPTIONS request includes **CORS headers**
- [ ] Backend logs show `✅ OPTIONS preflight handled`
- [ ] Login works without CORS errors
- [ ] No CORS errors in browser console

---

## 🆘 Troubleshooting

### Issue: Backend won't start

**Check:**
1. Port 5000 is not in use:
   ```powershell
   netstat -ano | findstr :5000
   ```
2. Database connection is working
3. Dependencies are installed: `npm install`

### Issue: Frontend can't connect to backend

**Check:**
1. Backend is running on port 5000
2. API URL in frontend config points to `http://localhost:5000/api`
3. No firewall blocking localhost connections

### Issue: OPTIONS request fails

**Check:**
1. Backend logs for errors
2. OPTIONS handler is in `server.js` (line 37-38)
3. No other middleware blocking OPTIONS requests

### Issue: CORS headers missing

**Check:**
1. Backend `server.js` has the OPTIONS handler
2. Handler is the FIRST middleware (before anything else)
3. Backend server was restarted after code changes

### Issue: Login still fails with CORS error

**Check:**
1. Browser console for exact error message
2. Backend logs for `✅ OPTIONS preflight handled`
3. Network tab in browser DevTools:
   - Check OPTIONS request status
   - Check response headers
   - Look for CORS headers

---

## 🎯 Expected Behavior

### ✅ Working Correctly:

1. **OPTIONS Request:**
   - Returns 204 status
   - Includes all CORS headers
   - Backend logs show "OPTIONS preflight handled"

2. **Login Request:**
   - No CORS errors
   - Login succeeds
   - User is authenticated

3. **Backend Logs:**
   - Shows OPTIONS preflight handled
   - Shows login attempt
   - No CORS-related errors

### ❌ Not Working:

1. **OPTIONS Request:**
   - Returns error or wrong status
   - Missing CORS headers
   - Backend logs show no OPTIONS handling

2. **Login Request:**
   - CORS errors in console
   - Login fails
   - "No 'Access-Control-Allow-Origin' header" error

---

## 📝 Quick Test Commands

### Test 1: Backend Health
```powershell
curl http://localhost:5000/api/health
```
**Expected:** `{"status":"OK","message":"Server is running"}`

### Test 2: OPTIONS Preflight
```powershell
curl -X OPTIONS http://localhost:5000/api/auth/login -H "Origin: http://localhost:3000" -v
```
**Expected:** 204 status with CORS headers

### Test 3: Login (POST)
```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -H "Origin: http://localhost:3000" `
  -d '{"email":"admin@lbf.co.in","password":"Admin123@"}' `
  -v
```
**Expected:** 200 status with auth token (or 401 if wrong credentials, but NO CORS error)

---

## 🎉 Success!

If all tests pass locally:
1. ✅ CORS fix is working
2. ✅ Ready to deploy to Azure
3. ✅ After Azure deployment, disable Azure CORS settings

---

## 📞 Next Steps

After local testing succeeds:
1. Commit and push changes to GitHub
2. Deploy to Azure (GitHub Actions or manual)
3. **Disable Azure CORS settings** (critical!)
4. Restart Azure App Service
5. Test in production

---

**Remember:** Local testing proves the code works. Azure CORS settings must be disabled in production for it to work there too!
