# Deploy Changes to PRD Environment

## 🎯 Summary of Changes

All new features have been implemented and are ready for PRD deployment:

1. ✅ Individual checklist rescheduling (2 times per checklist)
2. ✅ Backdated and future dates for rescheduling  
3. ✅ Scheduled audits open only on scheduled date
4. ✅ Schedule Adherence in dashboard
5. ✅ Checklist assignment user-wise
6. ✅ Rate limit fixes for mobile app
7. ✅ Role management permission updates

---

## 🚀 Quick Deployment Steps

### Step 1: Commit and Push Changes

```powershell
# Navigate to project root
cd D:\audit_Checklists-app

# Check status
git status

# Stage all changes
git add .

# Commit with message
git commit -m "feat: New audit scheduling features and role management updates

- Individual checklist rescheduling (2 times per checklist)
- Backdated and future dates for rescheduling
- Scheduled audits open only on scheduled date
- Schedule Adherence metric in dashboard
- Checklist assignment user-wise
- Rate limit fixes (20→100 for login)
- Role management permission updates"

# Push to repository
git push origin master
```

### Step 2: Deploy Backend (Azure App Service)

**Via Azure Portal:**
1. Go to Azure Portal → App Services → `audit-app-backend-2221`
2. Go to **Deployment Center**
3. If using GitHub Actions, deployment will trigger automatically
4. If using ZIP deploy:
   - Create ZIP of `backend` folder
   - Upload via Deployment Center → ZIP Deploy

**Via Azure CLI:**
```bash
cd backend
az webapp deployment source config-zip \
  --resource-group audit-app-rg \
  --name audit-app-backend-2221 \
  --src backend.zip
```

### Step 3: Deploy Frontend (Static Web App)

**Automatic (if GitHub Actions configured):**
- Push to master triggers automatic deployment
- Check GitHub Actions tab for status

**Manual:**
```bash
cd web
npm install
npm run build
# Upload build folder to Static Web App
```

### Step 4: Restart Backend (Important!)

**Why:** To apply rate limit changes and clear existing rate limit counters

**How:**
1. Azure Portal → App Services → `audit-app-backend-2221`
2. Click **Restart** button
3. Wait for restart to complete (~30 seconds)

### Step 5: Verify Deployment

#### Test Backend API
```bash
# Test Schedule Adherence endpoint
curl https://audit-app-backend-2221.azurewebsites.net/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return scheduleAdherence object
```

#### Test Frontend
1. Open web app URL
2. Login
3. Check Dashboard for Schedule Adherence card
4. Test reschedule functionality
5. Verify same-day validation

#### Test Mobile App
1. Update API URL if needed
2. Test login (should work without rate limit)
3. Test reschedule
4. Verify error messages

---

## 📋 Files Changed (Summary)

### Backend Files
- `backend/routes/scheduled-audits.js` - Reschedule logic
- `backend/routes/audits.js` - Same-day validation
- `backend/routes/analytics.js` - Schedule Adherence
- `backend/routes/roles.js` - Permission updates
- `backend/server.js` - Rate limit fixes

### Frontend Files
- `web/src/pages/Dashboard.js` - Schedule Adherence card
- `web/src/pages/AuditForm.js` - Same-day validation
- `web/src/pages/ScheduledAudits.js` - Reschedule updates

### Mobile Files
- `mobile/src/screens/ScheduledAuditsScreen.js` - Reschedule logic
- `mobile/src/services/ApiService.js` - Error handling
- `mobile/src/screens/LoginScreen.js` - Error messages

---

## ⚠️ Important Notes

1. **Rate Limits:** Backend must be restarted to apply new rate limit (100 attempts)
2. **Database:** No schema changes - existing tables are used
3. **Backward Compatible:** All changes are backward compatible
4. **No Breaking Changes:** Existing functionality remains intact

---

## 🔍 Post-Deployment Checks

- [ ] Backend restarted successfully
- [ ] API endpoints responding
- [ ] Schedule Adherence visible on dashboard
- [ ] Reschedule works (per-checklist)
- [ ] Backdated rescheduling works
- [ ] Same-day validation works
- [ ] Mobile app login works
- [ ] No errors in Azure logs

---

## 📞 If Issues Occur

1. **Check Azure App Service Logs:**
   - Azure Portal → App Service → Log stream
   - Look for errors

2. **Verify Environment Variables:**
   - Azure Portal → App Service → Configuration
   - Check all required variables are set

3. **Check Database Connection:**
   - Verify connection string is correct
   - Test database connectivity

4. **Rollback if Needed:**
   - Revert git commit
   - Redeploy previous version

---

## ✅ Ready to Deploy!

All changes are tested and ready. Follow the steps above to deploy to PRD.

**Estimated Deployment Time:** 10-15 minutes

