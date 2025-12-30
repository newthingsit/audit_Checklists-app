# Quick Deploy - time_taken_minutes Fix

## ✅ Fix Applied
- **Commit:** `5055dae` - Removed `time_taken_minutes` column from query
- **Issue:** Column doesn't exist in `audit_items` table
- **Status:** Code pushed to master ✅

## 🚀 Quick Deployment Steps

### Step 1: Verify Code is on Master
```bash
git log --oneline -1
# Should show: 5055dae fix: remove time_taken_minutes column from query
```

### Step 2: Deploy to Azure App Service

**Option A: Automatic (If GitHub Connected)**
1. Azure Portal → App Services → `audit-app-backend-2221-g9cna3ath2b4h8br`
2. Go to **Deployment Center**
3. Click **Sync** or wait for auto-deploy
4. Monitor deployment status

**Option B: Manual ZIP Deploy**
```powershell
# Create deployment package
cd D:\audit_Checklists-app\backend
Compress-Archive -Path * -Exclude node_modules -DestinationPath ..\backend-deploy.zip -Force

# Then upload via Azure Portal:
# 1. Azure Portal → App Services → audit-app-backend-2221-g9cna3ath2b4h8br
# 2. Deployment Center → ZIP Deploy
# 3. Upload backend-deploy.zip
```

**Option C: Kudu Console**
1. Go to: `https://audit-app-backend-2221-g9cna3ath2b4h8br.scm.centralindia-01.azurewebsites.net`
2. **Deployments** tab → **Deploy** or **Sync**

### Step 3: Restart Backend (CRITICAL!)
1. Azure Portal → App Services → `audit-app-backend-2221-g9cna3ath2b4h8br`
2. Click **Restart** button (top toolbar)
3. Wait ~30-60 seconds
4. Check **Log stream** to verify server started

### Step 4: Verify Fix
```bash
# Test the endpoint
curl https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api/audits/139 \
  -H "Authorization: Bearer <token>"

# Should return 200 OK with audit data (no more 500 error)
```

## ✅ Expected Result
- ✅ No more "Invalid column name 'time_taken_minutes'" error
- ✅ `/api/audits/139` returns 200 OK
- ✅ Audit details load correctly
- ✅ Frontend shows audit report

## 🔍 If Issues Persist
Check Azure Log stream for:
- Server startup messages
- Database connection status
- Any new error messages

---

**Status:** Ready to Deploy
**Estimated Time:** 5-10 minutes

