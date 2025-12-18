# 🚀 Production Deployment Guide

## ✅ Git Changes Pushed Successfully

**Commit:** `c4a8019` - feat: Category-wise audit selection, 100m proximity check, and enhanced audit history

**Files Changed:** 14 files
- Backend: 1 file (templates.js)
- Mobile: 4 files
- Web: 3 files
- Documentation: 2 files

---

## 📋 Deployment Steps

### Step 1: Deploy Backend to Azure App Service

#### Option A: Automatic Deployment (GitHub Actions)
If you have GitHub Actions configured, deployment should trigger automatically after the push.

**Check Status:**
1. Go to GitHub repository → Actions tab
2. Verify the deployment workflow is running
3. Wait for completion (~5-10 minutes)

#### Option B: Manual ZIP Deploy

```powershell
# Navigate to backend folder
cd D:\audit_Checklists-app\backend

# Create ZIP file (exclude node_modules)
Compress-Archive -Path * -DestinationPath ..\backend-deploy.zip -Force

# Deploy using Azure CLI (if installed)
az webapp deployment source config-zip `
  --resource-group audit-app-rg `
  --name audit-app-backend-2221 `
  --src ..\backend-deploy.zip
```

**Or via Azure Portal:**
1. Go to Azure Portal → App Services → `audit-app-backend-2221`
2. Go to **Deployment Center**
3. Click **ZIP Deploy**
4. Upload `backend-deploy.zip`
5. Wait for deployment to complete

### Step 2: Restart Backend Server (IMPORTANT!)

**Why:** To apply the new template categories feature and ensure all changes are loaded.

**How:**
1. Azure Portal → App Services → `audit-app-backend-2221`
2. Click **Restart** button (top toolbar)
3. Wait ~30 seconds for restart to complete
4. Verify server is running (Status should show "Running")

### Step 3: Deploy Frontend (Static Web App)

#### Option A: Automatic (GitHub Actions)
If configured, frontend deployment should trigger automatically.

**Check Status:**
1. GitHub → Actions tab
2. Look for Static Web App deployment workflow
3. Verify completion

#### Option B: Manual Build & Deploy

```powershell
# Navigate to web folder
cd D:\audit_Checklists-app\web

# Install dependencies
npm install

# Build for production
npm run build

# Deploy build folder to Azure Static Web App
# (Use Azure Portal or Azure CLI)
```

**Via Azure Portal:**
1. Azure Portal → Static Web Apps → Your app
2. Go to **Deployment Center**
3. Upload build folder or configure GitHub Actions

### Step 4: Verify Deployment

#### Test Backend API

```powershell
# Test templates endpoint (should return categories)
curl https://audit-app-backend-2221.azurewebsites.net/api/templates `
  -H "Authorization: Bearer YOUR_TOKEN"

# Should see "categories" array in template objects
```

#### Test Frontend Features

1. **Category Selection:**
   - Go to Checklists page
   - Should see categories first
   - Select a category to see templates

2. **Audit History:**
   - Go to Audit History
   - Click on any audit card
   - Verify Print and Email buttons are visible

3. **Proximity Check:**
   - Start a new audit
   - Verify 100m proximity check works
   - Try continuing an audit from history

#### Test Mobile App

1. **Update API URL** (if needed):
   - Check `mobile/app.json` → `expo.extra.apiUrl.production`
   - Should point to: `https://audit-app-backend-2221.azurewebsites.net/api`

2. **Test Features:**
   - Category selection in Checklists screen
   - 100m proximity check when starting audit
   - Photo upload (no notification should appear)
   - Continue audit with proximity check

---

## 🔍 Post-Deployment Checklist

- [ ] Backend server restarted successfully
- [ ] Backend API responding (check `/api/templates`)
- [ ] Templates endpoint returns `categories` array
- [ ] Frontend shows category selection
- [ ] Audit History shows Print/Email buttons
- [ ] Mobile app can connect to backend
- [ ] Category selection works in mobile app
- [ ] 100m proximity check works
- [ ] No errors in Azure App Service logs
- [ ] No errors in browser console

---

## 📊 Monitoring

### Check Azure Logs

1. **Backend Logs:**
   - Azure Portal → App Services → `audit-app-backend-2221`
   - Go to **Log stream** (left menu)
   - Monitor for errors

2. **Application Insights** (if configured):
   - Check for any exceptions or errors
   - Monitor API response times

### Common Issues & Solutions

#### Issue: Categories not showing
**Solution:**
- Verify backend is restarted
- Check database has categories in `checklist_items.category` column
- Verify templates endpoint returns categories array

#### Issue: Proximity check not working
**Solution:**
- Verify location permissions are granted (mobile)
- Check GPS coordinates are set for locations
- Verify `maxDistance` is set to 100 in code

#### Issue: Print/Email buttons not visible
**Solution:**
- Clear browser cache
- Verify frontend deployment completed
- Check browser console for errors

---

## 🎯 Key Changes Summary

### 1. Category-wise Selection
- **Backend:** Templates now include `categories` array
- **Mobile:** Categories shown first, then templates
- **Web:** Categories shown first, then templates

### 2. 100m Proximity Check
- **Changed from:** 500m
- **Changed to:** 100m
- **Applies to:** Starting new audits and continuing existing audits

### 3. Print/Email in History
- **Added:** Print and Email buttons to audit history cards
- **Functionality:** Uses existing print/email features from audit detail page

### 4. Photo Upload Notification
- **Removed:** Success notifications when uploading photos
- **Applies to:** Both mobile and web apps

---

## 📞 Support

If you encounter issues:

1. **Check Azure Logs:** App Service → Log stream
2. **Verify Environment Variables:** App Service → Configuration
3. **Test API Endpoints:** Use Postman or curl
4. **Check Database:** Verify data integrity

---

## ✅ Deployment Complete!

Once all steps are completed and verified, your production environment will have:
- ✅ Category-wise audit selection
- ✅ 100m proximity enforcement
- ✅ Enhanced audit history with print/email
- ✅ Improved photo upload experience

**Estimated Total Deployment Time:** 15-20 minutes

