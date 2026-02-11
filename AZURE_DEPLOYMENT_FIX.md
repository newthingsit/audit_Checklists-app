# 🔧 Azure Deployment 409 Conflict Error - Fix Guide

## ❌ Error Details

```
Error: Failed to deploy web package to App Service.
Error: Deployment Failed, Error: Failed to deploy web package using OneDeploy to App Service.
Conflict (CODE: 409)
```

## 🔍 What Causes 409 Conflict Error?

A 409 Conflict error during Azure deployment typically means:

1. **Another deployment is in progress** - Most common cause
2. **App Service is restarting** - App is in a transitional state
3. **Resource lock** - Another process has locked the app
4. **Concurrent deployment** - Multiple deployments triggered simultaneously

## ✅ Solutions

### Solution 1: Wait and Retry (Recommended)

**Step 1: Check Current Deployment Status**
1. Go to Azure Portal → App Services → `audit-app-backend-2221`
2. Check **Deployment Center** → **Logs** tab
3. Look for any in-progress deployments
4. Wait for any active deployment to complete

**Step 2: Check App Status**
1. In Azure Portal, verify app status is **Running** (not "Restarting" or "Stopped")
2. If app is restarting, wait for it to complete

**Step 3: Retry Deployment**
- Re-run the GitHub Actions workflow
- Or manually trigger deployment again

### Solution 2: Stop and Restart App Service

**Via Azure Portal:**
1. Azure Portal → App Services → `audit-app-backend-2221`
2. Click **Stop** button (wait ~30 seconds)
3. Click **Start** button (wait ~30 seconds)
4. Verify status is **Running**
5. Retry deployment

**Via Azure CLI:**
```bash
# Stop the app
az webapp stop --name audit-app-backend-2221 --resource-group audit-app-rg

# Wait 30 seconds, then start
az webapp start --name audit-app-backend-2221 --resource-group audit-app-rg

# Verify status
az webapp show --name audit-app-backend-2221 --resource-group audit-app-rg --query state
```

### Solution 3: Cancel In-Progress Deployments

**Via Azure Portal:**
1. Azure Portal → App Services → `audit-app-backend-2221`
2. Go to **Deployment Center** → **Logs**
3. Find any in-progress deployments
4. If possible, cancel them
5. Wait 1-2 minutes
6. Retry deployment

### Solution 4: Use Manual ZIP Deploy (Bypass GitHub Actions)

If GitHub Actions keeps failing, deploy manually:

**Step 1: Create ZIP File**
```powershell
# Navigate to project root
cd D:\audit_Checklists-app

# Create ZIP (exclude node_modules and other unnecessary files)
# Prefer tar to ensure exclusions are applied
tar -a -c -f backend-deploy.zip --exclude=node_modules --exclude=.git --exclude=*.zip --exclude=*.log --exclude=.env.local --exclude=.env.development -C backend .
```

**Step 2: Deploy via Azure Portal**
1. Azure Portal → App Services → `audit-app-backend-2221`
2. Go to **Deployment Center** → **ZIP Deploy**
3. Upload `backend-deploy.zip`
4. Click **Deploy**
5. Wait for completion (~2-5 minutes)

**Important:** Ensure build-on-deploy is enabled so dependencies are installed on the App Service:
```bash
az webapp config appsettings set \
  --resource-group audit-app-rg \
  --name audit-app-backend-2221 \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

**Step 3: Restart App Service**
1. Click **Restart** button
2. Wait ~30 seconds
3. Verify app is running

### Solution 5: Update GitHub Actions Workflow (Prevent Future Conflicts)

Add retry logic and better error handling to `.github/workflows/azure-app-service.yml`:

```yaml
- name: Deploy to Azure Web App
  uses: azure/webapps-deploy@v3
  with:
    app-name: audit-app-backend-2221
    package: backend.zip
    slot-name: production
  continue-on-error: false
  retries: 3
  retry-delay: 30000  # 30 seconds between retries
```

## 🔄 Recommended Workflow

1. **Check Azure Portal** for active deployments
2. **Wait 2-3 minutes** if deployment is in progress
3. **Verify app status** is "Running"
4. **Retry GitHub Actions** workflow
5. **If still failing**, use manual ZIP deploy

## 📊 Check Deployment Status

**Via Azure Portal:**
- App Services → `audit-app-backend-2221` → **Deployment Center** → **Logs**

**Via Azure CLI:**
```bash
az webapp deployment list-publishing-profiles \
  --name audit-app-backend-2221 \
  --resource-group audit-app-rg
```

## ⚠️ Important Notes

1. **Don't deploy multiple times simultaneously** - Wait for one to complete
2. **Database migrations run automatically** - No manual SQL needed
3. **Restart app after deployment** - Ensures all changes are loaded
4. **Check logs** if deployment succeeds but app doesn't work

## 🚀 Quick Fix Command

If you have Azure CLI installed:

```bash
# Stop app
az webapp stop --name audit-app-backend-2221 --resource-group audit-app-rg

# Wait 30 seconds, then start
timeout /t 30
az webapp start --name audit-app-backend-2221 --resource-group audit-app-rg

# Wait 30 seconds, then retry deployment
timeout /t 30
# Re-run GitHub Actions workflow
```

## 📝 After Successful Deployment

1. **Restart the app** (Azure Portal → Restart button)
2. **Verify app is running** (Status should be "Running")
3. **Test the API** - Visit: https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api/health
4. **Check logs** if issues persist (Azure Portal → Log stream)

---

## 🧩 Fix "Cannot find module 'express'" (or other missing modules)

If the App Service logs show missing Node modules (for example `express` or `@opentelemetry/sdk-trace-node`), the deployment likely skipped the build step.

### ✅ Fix (Recommended)

1. **Enable build-on-deploy** so Azure runs `npm ci` during deployment:
  ```bash
  az webapp config appsettings set \
    --resource-group audit-app-rg \
    --name audit-app-backend-2221 \
    --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true
  ```
2. **Redeploy** your backend ZIP (created from the `backend` folder).
3. **Restart** the App Service.

### ✅ Alternative Fix (If build-on-deploy is blocked)

1. Install dependencies locally:
  ```bash
  cd backend
  npm ci --omit=dev
  ```
2. Create a ZIP **including** `node_modules`.
3. Deploy the ZIP and restart the App Service.

---

**Most Common Fix:** Wait 2-3 minutes and retry the deployment. The 409 error usually resolves itself once any in-progress deployment completes.

