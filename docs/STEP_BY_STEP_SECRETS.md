# 🔐 Step-by-Step: Adding GitHub Secrets

Follow these exact steps to add the required secrets.

---

## 📋 Secret 1: AZURE_STATIC_WEB_APPS_API_TOKEN

### Step 1: Get Token from Azure
1. Open **Azure Portal**: https://portal.azure.com
2. In the search bar (top), type: **"Static Web Apps"**
3. Click on **"Static Web Apps"**
4. Click on **`audit-app-frontend`**
5. In the left sidebar, scroll down to **"Settings"**
6. Click **"Manage deployment token"**
7. You'll see a long token string
8. Click the **copy icon** (📋) next to the token
9. **Save it somewhere** (you'll paste it in GitHub)

### Step 2: Add to GitHub
1. Open: https://github.com/newthingsit/audit_Checklists-app/settings/secrets/actions
2. Click **"New repository secret"** (top right)
3. **Name**: `AZURE_STATIC_WEB_APPS_API_TOKEN`
4. **Secret**: Paste the token you copied
5. Click **"Add secret"**

✅ **Secret 1 Done!**

---

## 📋 Secret 2: AZURE_WEBAPP_PUBLISH_PROFILE

### Step 1: Get Publish Profile from Azure
1. In **Azure Portal**, search for: **"App Services"**
2. Click on **"App Services"**
3. Click on **`audit-app-backend-2221`**
4. At the top toolbar, click **"Get publish profile"** button
5. A file will download (`.PublishSettings`)
6. **Open the file** in Notepad or any text editor
7. **Select All** (Ctrl+A) and **Copy** (Ctrl+C) - you need the ENTIRE XML content

### Step 2: Add to GitHub
1. Go to: https://github.com/newthingsit/audit_Checklists-app/settings/secrets/actions
2. Click **"New repository secret"**
3. **Name**: `AZURE_WEBAPP_PUBLISH_PROFILE`
4. **Secret**: Paste the ENTIRE XML content (it's long, that's OK)
5. Click **"Add secret"**

✅ **Secret 2 Done!**

---

## 📋 Secret 3: REACT_APP_API_URL

### Step 1: Add to GitHub
1. Go to: https://github.com/newthingsit/audit_Checklists-app/settings/secrets/actions
2. Click **"New repository secret"**
3. **Name**: `REACT_APP_API_URL`
4. **Secret**: `https://audit-app-backend-2221.azurewebsites.net/api`
   (Copy this exact value)
5. Click **"Add secret"**

✅ **Secret 3 Done!**

---

## ✅ Verify All Secrets Added

You should now see 3 secrets in your GitHub repository:

1. ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN`
2. ✅ `AZURE_WEBAPP_PUBLISH_PROFILE`
3. ✅ `REACT_APP_API_URL`

---

## 🎯 Next: Update CORS Settings

After secrets are added, update CORS:

1. **Azure Portal** → **App Services** → `audit-app-backend-2221`
2. **Settings** → **Environment variables**
3. Find **`CORS_ORIGINS`** in the list
4. Click on it to edit
5. **Update the value** to:
   ```
   https://audit-app-frontend-xxxxx.azurestaticapps.net,http://localhost:3000
   ```
   *(Replace `xxxxx` with your actual Static Web App URL - find it in Static Web Apps → Overview)*
6. Click **"Apply"** at the top
7. Wait for the app to restart (~30 seconds)

---

## 🚀 Trigger Deployment

After secrets and CORS are configured:

### Option 1: Push Code (Automatic)
```bash
echo "Ready for deployment" >> README.md
git add README.md
git commit -m "Ready for deployment"
git push origin main
```

### Option 2: Manual Trigger
1. Go to: https://github.com/newthingsit/audit_Checklists-app/actions
2. Click **"Azure App Service CI/CD - Backend"**
3. Click **"Run workflow"** → **"Run workflow"**

---

## 📊 Monitor Deployment

1. Go to: https://github.com/newthingsit/audit_Checklists-app/actions
2. You'll see workflows running
3. Click on a workflow to see progress
4. **Green checkmark** = Success ✅
5. **Red X** = Failed (click to see errors)

**First deployment takes 3-5 minutes**

---

## 🎉 Success!

Once both workflows show green checkmarks:

- ✅ **Backend**: `https://audit-app-backend-2221.azurewebsites.net/api`
- ✅ **Frontend**: `https://audit-app-frontend-xxxxx.azurestaticapps.net`

**Your app is live!** 🚀

---

## ❓ Need Help?

If you get stuck:
- Check the workflow logs in GitHub Actions
- Verify secret names are EXACTLY as shown (case-sensitive)
- Make sure publish profile XML is complete (no truncation)

