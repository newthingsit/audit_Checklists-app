# Azure Backend Deployment Fix

**Date:** 2026-02-13  
**Issue:** Production deployment failing with "Cannot find module 'express'"  
**Status:** 🔄 FIX IN PROGRESS (Run 21976917790)

---

## 🐛 Problem Identified

### Root Cause
Azure App Service deployment was **excluding node_modules** from the deployment package, and Azure's build automation (`SCM_DO_BUILD_DURING_DEPLOYMENT`) was not installing dependencies.

### Error Symptoms
```
Error: Cannot find module 'express'
Require stack:
- /home/site/wwwroot/server.js
```

### Impact
- ❌ Backend API completely non-functional
- ❌ All endpoints returning 503 or module not found errors
- ❌ Production deployment broken

---

## 🔧 Fix Applied

### Changes Made to `.github/workflows/azure-app-service.yml`

**1. Added dependency installation step:**
```yaml
- name: Install dependencies
  run: |
    cd backend
    npm ci --omit=dev
    echo "✅ Dependencies installed for production"
    ls -la node_modules | head -20
```

**2. Modified deployment package to include node_modules:**
```yaml
- name: Create deployment package
  run: |
    cd backend
    # REMOVED: -x "node_modules/*" exclusion
    zip -r ../backend.zip . -x "*.git*" -x "web.config" -x "*.md"
```

**3. Removed SCM_DO_BUILD_DURING_DEPLOYMENT:**
- No longer relying on Azure's build automation
- Building in CI ensures consistent, reproducible builds
- Faster deployment (no build time on Azure)

**4. Fixed resource group name:**
- Changed from `audit-app-rg` → `litebitefoods`
- Ensures restart command targets correct resource group

### Workflow Improvements
- ✅ Added npm cache for faster builds
- ✅ Production-only dependencies (`--omit=dev`)
- ✅ Explicit dependency verification in logs
- ✅ Correct resource group configuration

---

## 📊 Deployment Status

**Run ID:** 21976917790  
**URL:** https://github.com/newthingsit/audit_Checklists-app/actions/runs/21976917790  
**Status:** 🔄 IN PROGRESS (6+ minutes elapsed)  
**Expected Duration:** 10-15 minutes total

### Deployment Steps:
1. ✅ Checkout code
2. ✅ Setup Node.js 22.x with npm cache
3. 🔄 Install dependencies (`npm ci --omit=dev`)
4. 🔄 Create deployment package (with node_modules)
5. 🔄 Azure login
6. 🔄 Deploy to Azure Web App
7. 🔄 Restart application

---

## ✅ Verification Steps (After Deployment)

### 1. Check GitHub Actions Status
```bash
gh run view 21976917790
```

**Expected:** "completed" with "success" conclusion

### 2. Wait for Azure startup (2-3 minutes after deployment)
Azure App Service needs time to:
- Extract deployment package
- Start Node.js process
- Initialize application

### 3. Test Health Endpoints
```powershell
$api = "https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net"

# Test each health endpoint
Invoke-WebRequest -Uri "$api/api/health" -UseBasicParsing
Invoke-WebRequest -Uri "$api/api/healthz" -UseBasicParsing
Invoke-WebRequest -Uri "$api/api/readyz" -UseBasicParsing
```

**Expected:** All return HTTP 200 with JSON response

### 4. Test Authentication Endpoints
```powershell
# Login endpoint should respond (even if 400 for missing credentials)
Invoke-WebRequest -Uri "$api/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{}' `
  -UseBasicParsing
```

**Expected:** HTTP 400 (validation error) - proves endpoint is functional

### 5. Check Azure Logs
```bash
az webapp log tail \
  --name audit-app-backend-2221 \
  --resource-group litebitefoods
```

**Expected:** No "Cannot find module" errors

---

## 🚨 If Deployment Fails

### Check Logs
```bash
gh run view 21976917790 --log-failed
```

### Common Issues & Solutions

**Issue 1: npm ci fails**
- Check if package-lock.json is committed
- Verify Node.js version compatibility

**Issue 2: Deployment timeout**
- Retry deployment (automatic on workflow)
- Check Azure service status

**Issue 3: Resource group not found**
- Verify `litebitefoods` resource group exists
- Check Azure credentials in secrets

### Rollback Plan
If this deployment fails completely:
```bash
# Find last successful deployment (before the fix attempts)
gh run list --workflow="Azure App Service CI/CD - Backend" \
  --status success --limit 5

# Re-run that workflow
gh run rerun <previous-successful-run-id>
```

---

## 📈 Success Criteria

✅ **GitHub Actions:** Deployment completes successfully  
✅ **Azure Startup:** No module errors in logs  
✅ **Health Checks:** All endpoints return HTTP 200  
✅ **API Functionality:** Auth endpoints respond correctly  
✅ **Staging Verification:** Re-run STAGING_VERIFICATION_CHECKLIST.md

---

## 🎯 Next Steps After Success

1. **Verify all staging checks pass** (STAGING_VERIFICATION_RESULTS.md)
2. **Monitor for 24 hours** per PRODUCTION_VALIDATION_PLAN.md
3. **Update enterprise documentation** with lessons learned
4. **Consider adding deployment smoke tests** to catch this type of issue earlier

---

## 📝 Lessons Learned

### What Went Wrong
- Assumed Azure's `SCM_DO_BUILD_DURING_DEPLOYMENT` would work reliably
- Did not verify node_modules were being deployed
- Resource group name mismatch went undetected

### Best Practices for Future
1. **Build in CI, not on deployment target**
   - More control over build environment
   - Faster and more consistent
   - Earlier failure detection

2. **Include dependencies in deployment package**
   - Eliminates build-time dependencies on target
   - Faster startup (no npm install during app start)
   - More reliable deployments

3. **Verify configuration values**
   - Resource groups, app names, regions
   - Use environment variables for consistency

4. **Add deployment smoke tests**
   - Health check after deployment
   - Fail deployment if app doesn't start
   - Automatic rollback on failure

---

## 📞 Monitoring

Check deployment progress:
```bash
gh run watch 21976917790
```

Check live status:
```bash
gh run list --workflow="Azure App Service CI/CD - Backend" --limit 3
```

View GitHub Actions: https://github.com/newthingsit/audit_Checklists-app/actions

---

**Last Updated:** 2026-02-13  
**Fix Commit:** e8e77c3  
**Deployment Run:** https://github.com/newthingsit/audit_Checklists-app/actions/runs/21976917790
