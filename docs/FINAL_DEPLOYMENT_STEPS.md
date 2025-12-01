# 🎯 Final Deployment Steps

You're almost there! Follow these final steps to complete your deployment.

---

## ✅ What's Already Done

- ✅ Azure resources created (SQL, App Service, Static Web App)
- ✅ Backend environment variables configured
- ✅ Code pushed to GitHub
- ✅ GitHub Actions workflows ready
- ✅ Workflow files updated with correct app names

---

## 🔐 Step 1: Add GitHub Secrets (5 minutes)

### A. Get Static Web Apps Token

1. **Azure Portal** → **Static Web Apps** → `audit-app-frontend`
2. Click **"Manage deployment token"** (left sidebar)
3. **Copy the token** (long string)

### B. Get App Service Publish Profile

1. **Azure Portal** → **App Services** → `audit-app-backend-2221`
2. Click **"Get publish profile"** (top toolbar)
3. **Download** the `.PublishSettings` file
4. **Open in Notepad** and copy **entire XML content**

### C. Add Secrets to GitHub

1. Go to: **https://github.com/newthingsit/audit_Checklists-app/settings/secrets/actions**
2. Click **"New repository secret"** for each:

#### Secret 1: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- **Value**: Token from Step A
- **Purpose**: Deploys frontend to Static Web Apps

#### Secret 2: `AZURE_WEBAPP_PUBLISH_PROFILE`
- **Value**: Entire XML from Step B
- **Purpose**: Deploys backend to App Service

#### Secret 3: `REACT_APP_API_URL`
- **Value**: `https://audit-app-backend-2221.azurewebsites.net/api`
- **Purpose**: Frontend knows where to call backend API

---

## 🌐 Step 2: Update CORS Settings (2 minutes)

1. **Azure Portal** → **App Services** → `audit-app-backend-2221`
2. **Settings** → **Environment variables**
3. Find **`CORS_ORIGINS`** setting
4. **Update value** to:
   ```
   https://audit-app-frontend-xxxxx.azurestaticapps.net,http://localhost:3000
   ```
   *(Replace `xxxxx` with your actual Static Web App URL)*
5. Click **"Apply"** at the top

**To find your frontend URL:**
- Azure Portal → Static Web Apps → `audit-app-frontend` → Overview → Copy URL

---

## 🚀 Step 3: Trigger First Deployment

### Option A: Automatic (Recommended)

Just push any small change:

```bash
# In your project directory
echo "Deployment ready" >> README.md
git add README.md
git commit -m "Trigger deployment"
git push origin main
```

### Option B: Manual Trigger

1. Go to: **https://github.com/newthingsit/audit_Checklists-app/actions**
2. Click **"Azure App Service CI/CD - Backend"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

---

## 📊 Step 4: Monitor Deployment

1. Go to: **https://github.com/newthingsit/audit_Checklists-app/actions**
2. You'll see workflows running:
   - **Yellow dot** = Running
   - **Green checkmark** = Success ✅
   - **Red X** = Failed ❌

**First deployment takes 3-5 minutes**

---

## ✅ Step 5: Verify Deployment

### Test Backend
Open in browser:
```
https://audit-app-backend-2221.azurewebsites.net/api/health
```
Should return: `{"status":"ok"}` or similar

### Test Frontend
Open in browser:
```
https://audit-app-frontend-xxxxx.azurestaticapps.net
```
Should show your login page

---

## 🐛 Troubleshooting

### Backend Not Deploying

**Error: "Publish profile not found"**
- ✅ Check secret name is exactly: `AZURE_WEBAPP_PUBLISH_PROFILE`
- ✅ Verify XML content is complete (no truncation)
- ✅ Re-download publish profile if needed

**Error: "App name not found"**
- ✅ Verify app name in workflow: `audit-app-backend-2221`
- ✅ Check it matches Azure Portal exactly

### Frontend Not Deploying

**Error: "API token invalid"**
- ✅ Regenerate token in Azure Portal
- ✅ Update secret in GitHub

**Error: "Build failed"**
- ✅ Check `REACT_APP_API_URL` secret is set
- ✅ Verify it ends with `/api`

### CORS Errors

**Error: "CORS policy blocked"**
- ✅ Update `CORS_ORIGINS` in App Service
- ✅ Include both frontend URL and `http://localhost:3000`
- ✅ Click "Apply" and wait for restart

---

## 📝 Quick Reference

| Resource | URL |
|----------|-----|
| **Backend API** | `https://audit-app-backend-2221.azurewebsites.net/api` |
| **Frontend** | `https://audit-app-frontend-xxxxx.azurestaticapps.net` |
| **GitHub Actions** | `https://github.com/newthingsit/audit_Checklists-app/actions` |
| **GitHub Secrets** | `https://github.com/newthingsit/audit_Checklists-app/settings/secrets/actions` |

---

## 🎉 After Deployment

Once both deployments succeed:

1. ✅ **Test Login**: Go to frontend URL → Try logging in
2. ✅ **Test API**: Check backend health endpoint
3. ✅ **Monitor**: Check Application Insights in Azure Portal
4. ✅ **Update Mobile App**: Change API URL in `mobile/app.json`

---

## 📞 Need Help?

- **GitHub Actions Logs**: Click on failed workflow → View logs
- **Azure Portal Logs**: App Service → Log stream
- **Application Insights**: App Service → Application Insights → Live Metrics

---

**You're almost there! Add the secrets and trigger deployment!** 🚀

