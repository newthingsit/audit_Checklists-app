# 🔄 GitHub Actions Setup Guide

This guide will help you configure automatic deployments for both frontend and backend.

---

## 📋 Step 1: Get Required Secrets from Azure

### A. Get Static Web Apps Deployment Token

1. Go to Azure Portal → **Static Web Apps** → `audit-app-frontend`
2. Click **"Manage deployment token"** in the left menu
3. **Copy the token** (you'll need this)

### B. Get App Service Publish Profile

1. Go to Azure Portal → **App Services** → `audit-app-backend-2221`
2. Click **"Get publish profile"** button (top toolbar)
3. **Download the file** (it's an XML file)
4. **Open the file** and copy its entire contents

### C. Get Your URLs

- **Backend URL**: `https://audit-app-backend-2221.azurewebsites.net`
- **Frontend URL**: `https://audit-app-frontend-xxxxx.azurestaticapps.net` (from Static Web App overview)

---

## 🔐 Step 2: Add Secrets to GitHub

1. Go to your GitHub repository: `https://github.com/newthingsit/audit_Checklists-app`
2. Click **"Settings"** tab
3. Click **"Secrets and variables"** → **"Actions"**
4. Click **"New repository secret"** for each:

| Secret Name | Value | Where to Get |
|-------------|-------|--------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token | Static Web App → Manage deployment token |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Entire XML content | App Service → Get publish profile |
| `REACT_APP_API_URL` | `https://audit-app-backend-2221.azurewebsites.net/api` | Your backend URL + `/api` |

---

## ✅ Step 3: Verify Workflow Files

The workflow files are already created in `.github/workflows/`:

- ✅ `azure-static-web-apps.yml` - Frontend deployment
- ✅ `azure-app-service.yml` - Backend deployment

**Update the backend app name** if needed:
- File: `.github/workflows/azure-app-service.yml`
- Line 12: `AZURE_WEBAPP_NAME: 'audit-app-backend-2221'`

---

## 🚀 Step 4: Trigger First Deployment

### Option A: Automatic (Recommended)

Just push any change to trigger deployment:

```bash
# Make a small change
echo "# Deployment ready" >> README.md
git add README.md
git commit -m "Trigger deployment"
git push origin main
```

### Option B: Manual Trigger

1. Go to GitHub → Your repo → **"Actions"** tab
2. Select **"Azure App Service CI/CD - Backend"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

---

## 📊 Step 5: Monitor Deployments

1. Go to GitHub → **"Actions"** tab
2. You'll see workflows running:
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed (click to see errors)

---

## 🔧 Troubleshooting

### Backend Deployment Fails

**Error: "Publish profile not found"**
- Check secret name: Must be exactly `AZURE_WEBAPP_PUBLISH_PROFILE`
- Verify XML content is complete (no truncation)

**Error: "App name not found"**
- Update `AZURE_WEBAPP_NAME` in workflow file
- Must match your App Service name exactly

### Frontend Deployment Fails

**Error: "API token invalid"**
- Regenerate token in Azure Portal
- Update secret in GitHub

**Error: "Build failed"**
- Check `REACT_APP_API_URL` secret is set
- Verify it includes `/api` at the end

---

## 📝 Workflow Details

### Frontend Workflow (`azure-static-web-apps.yml`)
- **Triggers**: When code in `web/` folder changes
- **Builds**: React app with production API URL
- **Deploys**: To Azure Static Web Apps

### Backend Workflow (`azure-app-service.yml`)
- **Triggers**: When code in `backend/` folder changes
- **Builds**: Node.js app (production dependencies only)
- **Deploys**: To Azure App Service

---

## 🎯 Next Steps After Setup

1. ✅ Add all secrets to GitHub
2. ✅ Push code to trigger first deployment
3. ✅ Verify backend is accessible: `https://audit-app-backend-2221.azurewebsites.net/api/health`
4. ✅ Verify frontend loads: `https://audit-app-frontend-xxxxx.azurestaticapps.net`
5. ✅ Test login/registration on frontend

---

## 🔗 Quick Links

- [GitHub Actions](https://github.com/newthingsit/audit_Checklists-app/actions)
- [Azure Portal](https://portal.azure.com)
- [Static Web App](https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.Web%2FstaticSites)
- [App Service](https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.Web%2Fsites)

---

**Once secrets are added, deployments will happen automatically on every push!** 🚀

