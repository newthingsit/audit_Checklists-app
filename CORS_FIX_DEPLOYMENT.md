# 🚀 CORS Fix Deployment Guide

## ✅ Issue Fixed
**Problem:** Login failing in PRD due to CORS preflight request blocking
**Error:** `No 'Access-Control-Allow-Origin' header is present on the requested resource`

**Solution:** Updated CORS middleware to always set proper headers for OPTIONS (preflight) requests, ensuring browsers can complete the authentication flow.

---

## 📋 Deployment Steps

### Step 1: Commit and Push Changes

```powershell
# Navigate to project root
cd D:\audit_Checklists-app

# Check what files changed
git status

# Stage the CORS fix
git add backend/server.js

# Commit with descriptive message
git commit -m "fix: CORS preflight request handling for production login

- Fixed OPTIONS preflight requests to always return proper CORS headers
- Updated CORS middleware to use requesting origin for preflight responses
- Improved origin matching with normalized comparison
- Added debugging logs for preflight requests
- Updated Helmet CSP to allow backend connections

Fixes: Login failing in PRD with CORS policy error"

# Push to repository
git push origin master
```

### Step 2: Deploy Backend to Azure

#### Option A: Automatic Deployment (GitHub Actions) ✅ Recommended

If you have GitHub Actions configured, deployment will trigger automatically after pushing:

1. **Check GitHub Actions:**
   - Go to your GitHub repository
   - Click on **Actions** tab
   - Look for the "Azure App Service CI/CD - Backend" workflow
   - Wait for it to complete (~5-10 minutes)

2. **Verify Deployment:**
   - Check the workflow logs for any errors
   - Deployment should show "Deploy to Azure Web App" step as successful

#### Option B: Manual ZIP Deploy

If automatic deployment is not configured:

```powershell
# Navigate to backend folder
cd D:\audit_Checklists-app\backend

# Create ZIP file (exclude node_modules and .git)
Compress-Archive -Path * -Exclude @('node_modules', '.git') -DestinationPath ..\backend-cors-fix.zip -Force

# Deploy using Azure CLI (if installed)
az webapp deployment source config-zip `
  --resource-group audit-app-rg `
  --name audit-app-backend-2221 `
  --src ..\backend-cors-fix.zip
```

**Or via Azure Portal:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **App Services** → `audit-app-backend-2221`
3. Go to **Deployment Center** → **ZIP Deploy**
4. Upload `backend-cors-fix.zip`
5. Wait for deployment to complete

### Step 3: Restart Backend Server ⚠️ CRITICAL

**Why:** The CORS middleware changes require a server restart to take effect.

**Via Azure Portal:**
1. Go to Azure Portal → **App Services** → `audit-app-backend-2221`
2. Click **Restart** button (top toolbar)
3. Wait ~30-60 seconds for restart to complete
4. Verify status shows **Running**

**Via Azure CLI:**
```bash
az webapp restart --name audit-app-backend-2221 --resource-group audit-app-rg
```

### Step 4: Verify the Fix

#### Test 1: Check Backend Health
```bash
# Test backend is running
curl https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api/health

# Should return: {"status":"OK","message":"Server is running"}
```

#### Test 2: Test CORS Preflight (OPTIONS request)
```bash
# Test OPTIONS request from browser console or Postman
curl -X OPTIONS \
  https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api/auth/login \
  -H "Origin: https://app.litebitefoods.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Should return 204 with CORS headers:
# Access-Control-Allow-Origin: https://app.litebitefoods.com
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
# Access-Control-Allow-Headers: Content-Type, Authorization, ...
```

#### Test 3: Test Login from Production
1. Open `https://app.litebitefoods.com` in browser
2. Open browser DevTools (F12) → **Console** tab
3. Try to login with valid credentials
4. **Expected Result:**
   - ✅ No CORS errors in console
   - ✅ Login request succeeds
   - ✅ User is redirected to dashboard

#### Test 4: Check Backend Logs
1. Azure Portal → **App Services** → `audit-app-backend-2221`
2. Go to **Log stream** or **Logs** section
3. Look for CORS preflight log messages:
   ```
   CORS preflight request: { origin: 'https://app.litebitefoods.com', ... }
   ```

---

## 🔍 Troubleshooting

### Issue: Still Getting CORS Errors

**Check 1: Verify Server Restarted**
- Azure Portal → App Service → Check **Status** is "Running"
- Check **Log stream** for server restart messages

**Check 2: Verify Environment Variables**
- Azure Portal → App Service → **Configuration** → **Application settings**
- Ensure `NODE_ENV=production` is set
- Check `ALLOWED_ORIGINS` includes `https://app.litebitefoods.com` (optional, it's in defaults)

**Check 3: Clear Browser Cache**
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear browser cache and cookies

**Check 4: Verify Origin in Logs**
- Check backend logs for the exact origin being sent
- Ensure it matches `https://app.litebitefoods.com` (no trailing slash)

### Issue: Deployment Failed (409 Conflict)

**Solution:** Wait 2-3 minutes and retry. This usually means another deployment is in progress.

```bash
# Check deployment status
az webapp deployment list --name audit-app-backend-2221 --resource-group audit-app-rg

# Wait and retry
```

### Issue: Server Won't Start After Restart

**Check Logs:**
1. Azure Portal → App Service → **Log stream**
2. Look for startup errors
3. Check for missing environment variables

**Common Issues:**
- Missing `JWT_SECRET` → Add in Configuration
- Database connection issues → Check connection string
- Port binding errors → Usually auto-resolved by Azure

---

## ✅ Success Criteria

Deployment is successful when:
- ✅ Backend deployed without errors
- ✅ Backend server restarted successfully
- ✅ `/api/health` endpoint returns OK
- ✅ OPTIONS request returns 204 with CORS headers
- ✅ Login works from `https://app.litebitefoods.com`
- ✅ No CORS errors in browser console
- ✅ User can successfully authenticate

---

## 📝 Files Changed

- **`backend/server.js`**: Updated CORS middleware for proper preflight handling

### Key Changes:
1. **Line 54-55**: Always set headers for OPTIONS requests
2. **Line 67-70**: Use requesting origin for preflight (not `*`)
3. **Line 154-175**: Updated backup CORS middleware with normalized comparison
4. **Line 137-150**: Updated Helmet CSP configuration

---

## 🎯 Quick Reference

**Backend URL:** `https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net`  
**Frontend URL:** `https://app.litebitefoods.com`  
**App Service Name:** `audit-app-backend-2221`  
**Resource Group:** `audit-app-rg`

---

## 📞 Support

If issues persist after deployment:
1. Check Azure App Service **Log stream** for errors
2. Verify all environment variables are set correctly
3. Test OPTIONS request manually using curl/Postman
4. Check browser console for specific error messages
5. Verify the origin header matches exactly (case-sensitive after normalization)

---

**Estimated Deployment Time:** 5-10 minutes  
**Downtime:** ~30-60 seconds (during restart)

