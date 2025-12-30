# Deploy 500 Error Fix to PRD

## 🎯 Summary
Deploy fixes for the 500 Internal Server Error in `GET /api/audits/:id` endpoint.

## ✅ Changes Ready for Deployment

### Commits Pushed to Master:
- `b2615d0` - docs: add summary of 500 error fixes
- `b9f778d` - fix: improve error handling and fix Math.max bug with empty arrays
- `16dcee6` - fix: add comprehensive error handling and logging to GET /api/audits/:id endpoint
- `2495bb6` - fix: improve error handling in AuditDetail to show specific error messages
- `db56185` - docs: add test results for audit detail category fix

## 🚀 Deployment Steps

### Option 1: Automatic Deployment (If Configured)

If Azure App Service is configured for automatic deployment from GitHub:

1. **Verify Code is on Master:**
   ```bash
   git log --oneline -5
   # Should show commits above
   ```

2. **Check GitHub Actions (if configured):**
   - Go to GitHub repository → Actions tab
   - Verify deployment workflow is running
   - Wait for completion (~5-10 minutes)

3. **Check Azure Deployment Center:**
   - Azure Portal → App Services → `audit-app-backend-2221-g9cna3ath2b4h8br`
   - Go to **Deployment Center**
   - Check deployment status
   - View deployment logs

### Option 2: Manual Deployment via Azure Portal

1. **Create Backend Deployment Package:**
   ```powershell
   cd D:\audit_Checklists-app\backend
   
   # Create ZIP file (exclude node_modules)
   Compress-Archive -Path * -DestinationPath ..\backend-deploy.zip -Force
   ```

2. **Deploy via Azure Portal:**
   - Go to Azure Portal → App Services → `audit-app-backend-2221-g9cna3ath2b4h8br`
   - Navigate to **Deployment Center** or **Advanced Tools** → **Go** → **Kudu**
   - Use **ZIP Deploy** option
   - Upload `backend-deploy.zip`
   - Wait for deployment to complete

3. **Or Use Azure CLI:**
   ```bash
   az login
   az webapp deployment source config-zip \
     --resource-group <resource-group-name> \
     --name audit-app-backend-2221-g9cna3ath2b4h8br \
     --src backend-deploy.zip
   ```

### Option 3: Manual Deployment via Kudu/SCM

1. **Access Kudu Console:**
   - Go to: `https://audit-app-backend-2221-g9cna3ath2b4h8br.scm.centralindia-01.azurewebsites.net`
   - Or: Azure Portal → App Service → Advanced Tools → Go

2. **Deploy via Git:**
   - Kudu → **Deployments** tab
   - If GitHub is connected, click **Sync** or **Deploy**
   - Or use **ZIP Deploy** to upload package

## ⚠️ IMPORTANT: Restart Backend After Deployment

**Why:** To ensure all changes are loaded and error handling is active.

**How:**
1. Azure Portal → App Services → `audit-app-backend-2221-g9cna3ath2b4h8br`
2. Click **Restart** button (top toolbar)
3. Wait for restart to complete (~30-60 seconds)
4. Verify in **Log stream** that server started successfully

## ✅ Verification Steps

### 1. Check Backend Logs
```bash
# Azure Portal → App Service → Log stream
# Look for:
# - "Server running on port 8080"
# - No syntax errors
# - Database connection successful
```

### 2. Test API Endpoint
```bash
# Test with curl or Postman
curl https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api/audits/139 \
  -H "Authorization: Bearer <token>"

# Should return:
# - 200 OK with audit data (if exists)
# - 404 Not Found (if audit doesn't exist)
# - 500 with detailed error message (if error occurs - now with better logging)
```

### 3. Test Frontend
1. Open: `https://app.litebitefoods.com/audit/139`
2. Should show:
   - ✅ Audit details (if exists)
   - ✅ Better error message (if error occurs)
   - ✅ No more generic "Audit not found"

### 4. Check Error Logs (If Error Persists)
```bash
# Azure Portal → App Service → Log stream
# Look for detailed error logs with:
# - Error message
# - Stack trace
# - Context (auditId, userId, templateId)
```

## 📋 What Was Fixed

1. **Enhanced Error Logging:**
   - Full error messages with stack traces
   - Context information (auditId, userId, templateId)
   - Error details in API responses

2. **Unhandled Exception Handling:**
   - Try-catch wrapper around route handler
   - Prevents server crashes

3. **Math.max Bug Fix:**
   - Fixed `Math.max(...[])` returning `-Infinity`
   - Added defensive checks for empty arrays

4. **Frontend Error Messages:**
   - Specific error messages (404, 403, 500, network errors)
   - Better user experience

## 🔍 Troubleshooting

### If Deployment Fails:

1. **Check Azure Logs:**
   - Azure Portal → App Service → Log stream
   - Look for deployment errors

2. **Verify Environment Variables:**
   - Azure Portal → App Service → Configuration
   - Ensure all required variables are set:
     - `DB_TYPE=mssql`
     - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
     - `PUBLIC_BACKEND_URL` or `BACKEND_URL`

3. **Check Database Connection:**
   - Verify SQL Server connection string
   - Test database connectivity

4. **Verify Node.js Version:**
   - Azure Portal → App Service → Configuration → General settings
   - Should be Node.js 22.x or compatible

### If 500 Error Persists After Deployment:

1. **Check Backend Logs:**
   - Look for detailed error messages we added
   - Check stack traces
   - Verify context information

2. **Test Database Queries:**
   - Verify audit exists: `SELECT * FROM audits WHERE id = 139`
   - Verify template exists: `SELECT * FROM checklist_templates WHERE id = <template_id>`
   - Check for missing columns

3. **Check SQL Server Compatibility:**
   - Verify query syntax is compatible
   - Check for parameter binding issues

## 📝 Post-Deployment Checklist

- [ ] Backend deployed successfully
- [ ] Backend restarted
- [ ] Server started without errors (check logs)
- [ ] API endpoint responds (test with curl/Postman)
- [ ] Frontend shows audit details or proper error message
- [ ] Error logs show detailed information (if error occurs)
- [ ] No 500 errors in production

## 🎉 Expected Results

After successful deployment:

1. **Better Error Messages:**
   - Frontend shows specific error messages
   - Backend logs contain detailed debugging information

2. **Improved Stability:**
   - No more Math.max crashes
   - Unhandled exceptions caught and logged
   - Server won't crash from unexpected errors

3. **Easier Debugging:**
   - Detailed error logs with context
   - Stack traces for troubleshooting
   - Error details in API responses

---

**Status:** ✅ **READY FOR DEPLOYMENT**

**Estimated Time:** 10-15 minutes

**Next Step:** Deploy backend and restart server

