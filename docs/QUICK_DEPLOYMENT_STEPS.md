# ⚡ Quick Deployment Steps

Follow these steps in order to complete your Azure deployment.

---

## ✅ Checklist

### 1. Azure Resources Created
- [x] Resource Group: `audit-app-rg`
- [x] SQL Database: `audit_checklists`
- [x] App Service: `audit-app-backend-2221`
- [x] Static Web App: `audit-app-frontend`
- [ ] Storage Account (for photos) - Optional

### 2. Environment Variables Configured
- [x] Backend App Service environment variables set
- [ ] CORS_ORIGINS updated with frontend URL

### 3. GitHub Secrets Added
- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN`
- [ ] `AZURE_WEBAPP_PUBLISH_PROFILE`
- [ ] `REACT_APP_API_URL`

### 4. Code Deployed
- [ ] Backend deployed to App Service
- [ ] Frontend deployed to Static Web App

---

## 🎯 Current Status

✅ **Completed:**
- Azure resources created
- Code pushed to GitHub
- Workflow files ready

⏳ **Next Steps:**
1. Add GitHub secrets
2. Update CORS settings
3. Trigger deployment

---

## 📋 Action Items

### Immediate (5 minutes)

1. **Get Static Web Apps Token**
   - Azure Portal → Static Web Apps → `audit-app-frontend`
   - Manage deployment token → Copy

2. **Get App Service Publish Profile**
   - Azure Portal → App Services → `audit-app-backend-2221`
   - Get publish profile → Download → Copy entire XML

3. **Get Frontend URL**
   - Azure Portal → Static Web Apps → `audit-app-frontend`
   - Overview → Copy the URL

4. **Add Secrets to GitHub**
   - GitHub → Settings → Secrets → Actions
   - Add all 3 secrets

5. **Update CORS in Backend**
   - Azure Portal → App Services → Configuration
   - Update `CORS_ORIGINS` with frontend URL

### After Secrets Added (Automatic)

1. Push any change to trigger deployment
2. Monitor GitHub Actions
3. Test your deployed app

---

## 🔗 Your URLs

Once deployed, your app will be available at:

- **Frontend**: `https://audit-app-frontend-xxxxx.azurestaticapps.net`
- **Backend API**: `https://audit-app-backend-2221.azurewebsites.net/api`

---

**Ready to add the secrets? Follow `GITHUB_ACTIONS_SETUP.md`!** 🚀

