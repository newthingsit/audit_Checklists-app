# 🔧 Step-by-Step: Disable Azure CORS Settings

## ⚠️ CRITICAL: Azure CORS Must Be Disabled

Azure App Service has its own CORS settings that **OVERRIDE** your Node.js application code. Even if your code is perfect, Azure will block requests if CORS is configured there.

---

## 📋 Step-by-Step Instructions

### Step 1: Open Azure Portal

1. Go to: **https://portal.azure.com**
2. Sign in with your Azure account
3. Make sure you're in the correct subscription

### Step 2: Navigate to Your App Service

1. In the search bar at the top, type: **`audit-app-backend-2221`**
2. Click on the App Service when it appears
3. You should see the App Service overview page

### Step 3: Open CORS Settings

1. In the **left sidebar**, look for the **API** section
2. Click on **CORS** (it should be under API or Settings)
3. You'll see the CORS configuration page

### Step 4: Clear All CORS Settings

**What you should see:**
- A text box or list showing "Allowed Origins"
- Possibly some origins already listed (like `https://app.litebitefoods.com`)

**What to do:**
1. **DELETE ALL** origins from the "Allowed Origins" field
   - Select all text and delete it
   - Or remove each origin one by one
   - The field should be **completely empty**

2. **UNCHECK** "Enable Access-Control-Allow-Credentials" if it's checked
   - This checkbox should be **unchecked/disabled**

3. **UNCHECK** any other CORS-related checkboxes
   - Make sure everything is disabled

### Step 5: Save Changes

1. Click **Save** button at the top of the page
2. Wait for the confirmation message: **"Settings saved successfully"**
3. Wait **30 seconds** for changes to propagate

### Step 6: Verify CORS is Disabled

**After saving, verify:**
- "Allowed Origins" field is **empty**
- No origins are listed
- All checkboxes are **unchecked**

**This is CORRECT!** ✅
- Azure CORS should be completely disabled
- Your Node.js application will handle CORS instead

---

## 🔄 Step 7: Restart App Service

**Why:** Restart ensures all changes take effect and clears any cached CORS settings.

1. Still in the App Service page
2. Click **Restart** button in the top toolbar
3. Confirm the restart when prompted
4. Wait **2-3 minutes** for restart to complete
5. Check that status shows **Running** (green)

---

## ✅ Step 8: Test Login

### Test 1: Browser Login
1. Go to: **https://app.litebitefoods.com/login**
2. Try to log in
3. **Check browser console (F12)** for errors
4. Should see **NO CORS errors** ✅

### Test 2: Verify Preflight Request

**In browser console (F12), run this:**
```javascript
fetch('https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api/auth/login', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://app.litebitefoods.com',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type,Authorization'
  }
}).then(r => {
  console.log('✅ Status:', r.status);
  console.log('✅ CORS Headers:', {
    'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': r.headers.get('Access-Control-Allow-Methods'),
    'Access-Control-Allow-Credentials': r.headers.get('Access-Control-Allow-Credentials')
  });
}).catch(e => console.error('❌ Error:', e));
```

**Expected Result:**
- Status: **204** ✅
- Access-Control-Allow-Origin: **https://app.litebitefoods.com** ✅
- Access-Control-Allow-Credentials: **true** ✅

---

## 🎯 Success Indicators

You'll know it's fixed when:

✅ **Browser Console:**
- No CORS errors
- Login works successfully
- Preflight test returns 204 with CORS headers

✅ **Azure Portal:**
- CORS settings are empty/disabled
- App Service is running (green status)

✅ **Backend Logs:**
- See `✅ OPTIONS preflight handled` messages
- No CORS-related errors

---

## 🆘 If Still Not Working

### Check 1: Verify CORS is Really Disabled

1. Go back to Azure Portal → App Service → **CORS**
2. Make absolutely sure:
   - "Allowed Origins" is **completely empty**
   - No origins listed at all
   - All checkboxes unchecked

### Check 2: Check Backend Logs

1. Azure Portal → App Service → **Log stream**
2. Try logging in
3. Look for: `✅ OPTIONS preflight handled`
4. If you see this → OPTIONS handler is working
5. If you DON'T see this → Requests aren't reaching Node.js

### Check 3: Verify web.config Exists

1. Azure Portal → App Service → **Advanced Tools (Kudu)** → Go
2. Navigate to: `site/wwwroot/backend/`
3. Look for `web.config` file
4. If missing, see "Manual web.config Upload" in IMMEDIATE_CORS_FIX.md

### Check 4: Restart Again

Sometimes Azure needs a second restart:
1. Click **Restart** again
2. Wait 2-3 minutes
3. Try login again

---

## 📝 Quick Checklist

After completing all steps:

- [ ] Azure CORS "Allowed Origins" is **EMPTY**
- [ ] All CORS checkboxes are **UNCHECKED**
- [ ] Changes were **SAVED**
- [ ] App Service was **RESTARTED**
- [ ] App Service status shows **Running**
- [ ] Preflight test returns **204 with CORS headers**
- [ ] Login works without CORS errors ✅

---

## 🎉 Expected Result

After disabling Azure CORS and restarting:

1. **Login should work immediately** ✅
2. **No CORS errors in browser console** ✅
3. **Preflight requests return 204 with proper headers** ✅
4. **Backend logs show OPTIONS preflight handled** ✅

---

## 📞 Still Having Issues?

If login still doesn't work after:
1. ✅ Azure CORS is disabled
2. ✅ App Service restarted
3. ✅ Preflight test shows 204 with headers

Then check:
- Backend logs for any errors
- Verify `web.config` exists in backend folder
- Check if OPTIONS handler is in `server.js` (should be line 37-38)
- Try clearing browser cache and cookies

---

**Remember:** Azure CORS settings **MUST** be empty for your Node.js CORS code to work!
