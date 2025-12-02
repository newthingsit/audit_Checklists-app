# 🔧 Fix: Enable Basic Authentication for Publish Profile

## Problem
"Basic authentication is disabled" when trying to download publish profile.

## Solution: Enable Basic Authentication

### Step 1: Enable Basic Authentication

1. In Azure Portal, go to your App Service: `audit-app-backend-2221`
2. In the left sidebar, scroll down to **"Deployment"**
3. Click **"Deployment Center"**
4. Click **"Settings"** tab
5. Under **"Authentication"**, toggle **"Basic authentication"** to **ON**
6. Click **"Save"** at the top

### Step 2: Download Publish Profile

1. Go back to **"Overview"** page
2. Click **"Download publish profile"** button
3. The file should download now

---

## Alternative: Use Azure CLI

If you have Azure CLI installed:

```bash
az webapp deployment list-publishing-profiles \
  --name audit-app-backend-2221 \
  --resource-group audit-app-rg \
  --xml
```

This will output the publish profile XML directly.

---

## Alternative: Use Deployment Credentials

Instead of publish profile, you can use deployment credentials:

1. Go to App Service → **"Deployment Center"**
2. Click **"FTPS credentials"** tab
3. Note the **FTPS endpoint** and **username**
4. Click **"Reset publish profile"** to set a password
5. Use these credentials in GitHub Actions instead

---

## Quick Fix Steps

1. **App Service** → **"Deployment Center"** → **"Settings"**
2. Enable **"Basic authentication"**
3. **Save**
4. Go back to **"Overview"** → **"Download publish profile"**

---

**Try enabling basic authentication first - that's the quickest solution!**

