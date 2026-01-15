# 🚀 Manual Deployment Guide

**Date:** December 30, 2025  
**Purpose:** Deploy code changes manually while GitHub Actions is blocked

---

## 📋 Prerequisites

1. **Azure CLI installed** - [Download here](https://docs.microsoft.com/cli/azure/install-azure-cli)
2. **Node.js 18+** installed
3. **Azure account access** with permissions to deploy
4. **Git** installed

---

## 🔧 Step 1: Install Dependencies & Prepare

### Open Terminal/PowerShell in project root

```bash
# Navigate to project directory
cd D:\audit_Checklists-app
```

---

## 🌐 Step 2: Deploy Frontend (Web App)

### 2.1 Build the React App

```bash
# Navigate to web directory
cd web

# Install dependencies (if not already done)
npm install

# Build the production app
# Replace with your actual API URL if different
$env:REACT_APP_API_URL="https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api"
npm run build
```

**Note for Windows PowerShell:** Use `$env:REACT_APP_API_URL="..."`  
**Note for CMD:** Use `set REACT_APP_API_URL=...`  
**Note for Git Bash:** Use `export REACT_APP_API_URL=...`

### 2.2 Deploy to Azure Static Web Apps

You have **two options**:

#### Option A: Using Azure CLI (Recommended)

```bash
# Login to Azure
az login

# Get your Static Web App name (check Azure Portal)
# Then deploy using one of these methods:

# Method 1: Using Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli
swa deploy ./build --deployment-token YOUR_DEPLOYMENT_TOKEN --env production

# Method 2: Using Azure CLI (if you have the resource name)
az staticwebapp deploy \
  --name YOUR_STATIC_WEB_APP_NAME \
  --resource-group YOUR_RESOURCE_GROUP \
  --source-location ./build
```

#### Option B: Using Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your **Static Web App** resource
3. Click on **"Overview"** → **"Manage deployment token"**
4. Copy the deployment token
5. Use Azure Static Web Apps CLI:
   ```bash
   npm install -g @azure/static-web-apps-cli
   swa deploy ./build --deployment-token YOUR_TOKEN_HERE
   ```

#### Option C: Using GitHub (if you have access)

1. Go to your Static Web App in Azure Portal
2. Click **"Manage deployment token"**
3. Copy the token
4. Use it with the Static Web Apps CLI as shown above

---

## 🔧 Step 3: Deploy Backend (API)

### 3.1 Prepare Backend Package

```bash
# Navigate back to root, then to backend
cd ..
cd backend

# Install production dependencies
npm ci --only=production

# Create deployment package (ZIP file)
# For Windows PowerShell:
Compress-Archive -Path * -DestinationPath ..\backend.zip -Force

# For Windows CMD:
# Use 7-Zip or WinRAR to create backend.zip

# For Git Bash/Linux/Mac:
zip -r ../backend.zip . -x "node_modules/*" -x ".git/*" -x "*.zip"
```

### 3.2 Deploy to Azure App Service

#### Option A: Using Azure CLI (Recommended)

```bash
# Login to Azure (if not already logged in)
az login

# Deploy the ZIP file
az webapp deployment source config-zip \
  --resource-group YOUR_RESOURCE_GROUP \
  --name audit-app-backend-2221 \
  --src ../backend.zip

# Wait for deployment to complete (usually 2-5 minutes)
```

#### Option B: Using Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **App Service** → `audit-app-backend-2221`
3. Click **"Deployment Center"** or **"Advanced Tools"** → **"Go"** (Kudu)
4. Go to **"Zip Push Deploy"** or **"Deployment"** tab
5. Upload `backend.zip` file
6. Wait for deployment to complete

#### Option C: Using FTP

1. In Azure Portal → App Service → `audit-app-backend-2221`
2. Go to **"Deployment Center"** → **"FTPS credentials"**
3. Download publish profile or get FTP credentials
4. Use FTP client (FileZilla, WinSCP) to upload files
5. Upload contents of `backend.zip` to `/site/wwwroot`

---

## ✅ Step 4: Verify Deployment

### 4.1 Check Backend API

```bash
# Test API health endpoint
curl https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api/health

# Or open in browser:
# https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api/health
```

### 4.2 Check Frontend

1. Open your Static Web App URL in browser
2. Check browser console for errors
3. Test login functionality
4. Verify new features (print preview, category completion, etc.)

---

## 🔍 Step 5: Check Deployment Logs

### Backend Logs (Azure Portal)

1. Go to App Service → `audit-app-backend-2221`
2. Click **"Log stream"** or **"Logs"**
3. Check for any errors

### Frontend Logs (Azure Portal)

1. Go to Static Web App
2. Click **"Deployment history"**
3. Check latest deployment status

---

## 🛠️ Troubleshooting

### Issue: "az: command not found"
**Solution:** Install Azure CLI from [here](https://docs.microsoft.com/cli/azure/install-azure-cli)

### Issue: Build fails
**Solution:** 
```bash
# Clear cache and rebuild
cd web
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Deployment fails with authentication error
**Solution:**
```bash
# Re-login to Azure
az login
az account list  # Verify correct account
az account set --subscription YOUR_SUBSCRIPTION_ID
```

### Issue: Backend deployment succeeds but API doesn't work
**Solution:**
1. Check App Service → **"Configuration"** → **"Application settings"**
2. Verify all environment variables are set
3. Restart the App Service
4. Check **"Log stream"** for errors

### Issue: Frontend shows old version
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Check Static Web App deployment history
4. Wait 2-3 minutes for CDN propagation

---

## 📝 Quick Reference Commands

### Frontend Deployment (One-liner)
```powershell
cd web; npm run build; swa deploy ./build --deployment-token YOUR_TOKEN
```

### Backend Deployment (One-liner)
```powershell
cd backend; npm ci --only=production; Compress-Archive -Path * -DestinationPath ..\backend.zip -Force; az webapp deployment source config-zip --resource-group YOUR_RG --name audit-app-backend-2221 --src ..\backend.zip
```

---

## 🔐 Required Information

Before deploying, you'll need:

1. **Azure Resource Group Name** - Check Azure Portal
2. **Static Web App Name** - Check Azure Portal
3. **Static Web App Deployment Token** - Get from Azure Portal → Static Web App → Manage deployment token
4. **Backend API URL** - `https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api`

---

## 📞 Need Help?

If you encounter issues:
1. Check Azure Portal → App Service → Logs
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure Azure CLI is logged in with correct account

---

## ✅ Deployment Checklist

- [ ] Azure CLI installed and logged in
- [ ] Frontend built successfully (`npm run build`)
- [ ] Frontend deployed to Static Web App
- [ ] Backend packaged as ZIP file
- [ ] Backend deployed to App Service
- [ ] API health endpoint responding
- [ ] Frontend accessible and working
- [ ] New features tested (print preview, etc.)
- [ ] No errors in browser console
- [ ] No errors in Azure logs

---

**Last Updated:** December 30, 2025

