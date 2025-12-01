# ⚡ Quick Start - Complete Deployment

## 🎯 3 Simple Steps to Deploy

---

### Step 1: Add GitHub Secrets (5 min)

**Go to**: https://github.com/newthingsit/audit_Checklists-app/settings/secrets/actions

**Add these 3 secrets:**

1. **`AZURE_STATIC_WEB_APPS_API_TOKEN`**
   - Get from: Azure Portal → Static Web Apps → `audit-app-frontend` → Manage deployment token

2. **`AZURE_WEBAPP_PUBLISH_PROFILE`**
   - Get from: Azure Portal → App Services → `audit-app-backend-2221` → Get publish profile (copy entire XML)

3. **`REACT_APP_API_URL`**
   - Value: `https://audit-app-backend-2221.azurewebsites.net/api`

---

### Step 2: Update CORS (2 min)

1. Azure Portal → App Services → `audit-app-backend-2221`
2. Settings → Environment variables
3. Edit `CORS_ORIGINS`
4. Value: `https://audit-app-frontend-xxxxx.azurestaticapps.net,http://localhost:3000`
5. Apply

---

### Step 3: Deploy (Automatic)

Just push any change:
```bash
git push origin main
```

Or manually trigger: https://github.com/newthingsit/audit_Checklists-app/actions

---

## ✅ Done!

Monitor: https://github.com/newthingsit/audit_Checklists-app/actions

**Your app will be live in 3-5 minutes!** 🚀

---

**Detailed guide**: See `docs/STEP_BY_STEP_SECRETS.md`

