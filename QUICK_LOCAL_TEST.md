# ⚡ Quick Local CORS Test - 5 Minutes

## 🎯 Goal
Test CORS fix locally before deploying to Azure.

---

## 🚀 Quick Start (2 Terminals)

### Terminal 1: Backend

```powershell
# Navigate to backend
cd D:\audit_Checklists-app\backend

# Start backend (runs on port 5000)
npm start
```

**Wait for:** `Server running on port 5000` ✅

---

### Terminal 2: Frontend

```powershell
# Navigate to web (NEW terminal window)
cd D:\audit_Checklists-app\web

# Start frontend (runs on port 3000)
npm start
```

**Browser opens automatically to:** http://localhost:3000 ✅

---

## 🧪 Test CORS (Browser Console)

1. **Open browser:** http://localhost:3000
2. **Press F12** → Go to **Console** tab
3. **Paste this:**

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

**Expected:**
```
✅ Status: 204
✅ CORS Headers: {
  Origin: "http://localhost:3000"
  Methods: "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  Credentials: "true"
}
```

**If you see this → CORS is working! ✅**

---

## 🔐 Test Login

1. Go to: **http://localhost:3000/login**
2. Enter credentials and click **Sign In**
3. **Check browser console (F12)** - should see **NO CORS errors** ✅

---

## 📊 Check Backend Logs

**In Terminal 1 (backend), you should see:**

```
✅ OPTIONS preflight handled: { 
  origin: 'http://localhost:3000', 
  originInList: true,
  path: '/api/auth/login',
  timestamp: '...'
}
```

**If you see this → OPTIONS handler is working! ✅**

---

## ✅ Success Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] OPTIONS test returns **204** with CORS headers
- [ ] Backend logs show `✅ OPTIONS preflight handled`
- [ ] Login works without CORS errors

---

## 🆘 Troubleshooting

### Backend won't start?
- Check if port 5000 is in use
- Check database connection in `.env` file

### Frontend can't connect?
- Make sure backend is running first
- Check browser console for errors

### CORS still failing?
- Check backend terminal for errors
- Verify OPTIONS handler is in `server.js` (line 37-38)

---

**If all tests pass locally → Ready to deploy to Azure! 🚀**
