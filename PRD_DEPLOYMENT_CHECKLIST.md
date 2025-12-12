# PRD Deployment Checklist - New Features

## 🎯 Features to Deploy

### 1. ✅ Individual Checklist Rescheduling (2 times per checklist)
### 2. ✅ Backdated and Future Dates for Rescheduling
### 3. ✅ Scheduled Audits Open Only on Scheduled Date
### 4. ✅ Schedule Adherence in Dashboard
### 5. ✅ Checklist Assignment User-Wise
### 6. ✅ Rate Limit Fixes for Mobile App
### 7. ✅ Role Management Updates

---

## 📋 Pre-Deployment Checklist

### Code Review
- [x] All features implemented and tested locally
- [x] No console.log statements in production code
- [x] Error handling implemented
- [x] Database migrations ready (if any)
- [x] API endpoints tested
- [x] Frontend builds successfully
- [x] Mobile app compiles without errors

### Database Changes
- [x] `reschedule_tracking` table exists (already created)
- [x] `user_checklist_permissions` table exists (already created)
- [x] No new tables required
- [x] No schema migrations needed

### Configuration
- [x] Rate limits updated (20 → 100 for login)
- [x] Environment variables checked
- [x] CORS settings verified
- [x] API URLs configured

---

## 🚀 Deployment Steps

### Step 1: Commit Changes to Git

```bash
# Check current status
git status

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Implement new audit scheduling and role management features

Features Added:
- Individual checklist rescheduling (2 times per checklist)
- Backdated and future dates for rescheduling
- Scheduled audits open only on scheduled date
- Schedule Adherence metric in dashboard
- Checklist assignment user-wise
- Rate limit fixes for mobile app
- Role management permission updates

Backend Changes:
- backend/routes/scheduled-audits.js: Per-checklist reschedule tracking
- backend/routes/audits.js: Same-day validation for scheduled audits
- backend/routes/analytics.js: Schedule Adherence calculation
- backend/routes/roles.js: Updated permissions list
- backend/server.js: Increased login rate limit

Frontend Changes:
- web/src/pages/Dashboard.js: Schedule Adherence card
- web/src/pages/AuditForm.js: Same-day validation UI
- web/src/pages/ScheduledAudits.js: Updated reschedule logic

Mobile Changes:
- mobile/src/screens/ScheduledAuditsScreen.js: Per-checklist reschedule check
- mobile/src/services/ApiService.js: Better error handling
- mobile/src/screens/LoginScreen.js: Improved error messages"

# Push to repository
git push origin master
```

### Step 2: Deploy Backend to Azure App Service

**Option A: Via Azure Portal (ZIP Deploy)**
1. Build backend (if needed):
   ```bash
   cd backend
   npm install --production
   ```
2. Create ZIP file of backend folder
3. Azure Portal → App Service → Deployment Center → ZIP Deploy
4. Upload ZIP file
5. Wait for deployment to complete

**Option B: Via GitHub Actions (if configured)**
- Push to master branch will trigger automatic deployment
- Monitor GitHub Actions tab

**Option C: Via Azure CLI**
```bash
cd backend
az webapp deployment source config-zip \
  --resource-group audit-app-rg \
  --name audit-app-backend-2221 \
  --src deploy.zip
```

### Step 3: Deploy Frontend to Azure Static Web App

**Option A: Via GitHub Actions (Automatic)**
- Push to master branch triggers build
- Frontend automatically deploys

**Option B: Manual Build & Deploy**
```bash
cd web
npm install
npm run build
# Upload build folder to Static Web App
```

### Step 4: Verify Deployment

#### Backend API Tests
```bash
# Test reschedule endpoint
curl -X GET "https://audit-app-backend-2221.azurewebsites.net/api/scheduled-audits/reschedule-count?scheduled_audit_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test dashboard analytics (Schedule Adherence)
curl -X GET "https://audit-app-backend-2221.azurewebsites.net/api/analytics/dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Frontend Tests
1. Login to web app
2. Navigate to Dashboard
3. Verify Schedule Adherence card appears
4. Navigate to Scheduled Audits
5. Test reschedule functionality
6. Verify same-day validation works

#### Mobile App Tests
1. Update mobile app API URL (if needed)
2. Test login (should not hit rate limit)
3. Test reschedule functionality
4. Verify error messages are clear

### Step 5: Database Verification

**Check Tables Exist:**
```sql
-- Verify reschedule_tracking table
SELECT COUNT(*) FROM reschedule_tracking;

-- Verify user_checklist_permissions table
SELECT COUNT(*) FROM user_checklist_permissions;

-- Check roles table has updated permissions
SELECT name, permissions FROM roles WHERE name = 'manager';
```

### Step 6: Post-Deployment Verification

- [ ] Backend server starts without errors
- [ ] API endpoints respond correctly
- [ ] Frontend loads and displays correctly
- [ ] Schedule Adherence appears on dashboard
- [ ] Reschedule works (per-checklist, 2 times limit)
- [ ] Backdated rescheduling works
- [ ] Same-day validation works
- [ ] Checklist assignment works
- [ ] Mobile app can login
- [ ] Rate limits are appropriate

---

## 🔧 Configuration Updates Needed

### Backend Environment Variables
Verify these are set in Azure App Service:
- `NODE_ENV=production`
- `DB_TYPE=mssql` (or your database type)
- `JWT_SECRET` (strong secret)
- `CORS_ORIGINS` (frontend URL)
- Rate limit settings (now 100 for login)

### Frontend Environment Variables
- `REACT_APP_API_URL` (backend API URL)
- Update in `web/.env.production` if needed

### Mobile App Configuration
- Update `mobile/app.json` with production API URL
- Rebuild mobile app if API URL changed

---

## 📊 Rollback Plan

If issues occur:

1. **Rollback Backend:**
   ```bash
   # Revert to previous deployment
   az webapp deployment slot swap \
     --resource-group audit-app-rg \
     --name audit-app-backend-2221 \
     --slot staging \
     --target-slot production
   ```

2. **Rollback Frontend:**
   - Revert git commit
   - Push to trigger new deployment
   - Or manually deploy previous build

3. **Database Rollback:**
   - No schema changes, so no rollback needed
   - Data remains intact

---

## 🐛 Known Issues & Solutions

### Issue: Rate Limit Still Blocking
**Solution:** Restart backend server to clear rate limit counters

### Issue: Schedule Adherence Shows 0%
**Solution:** 
- Verify scheduled audits exist
- Check date comparison logic
- Verify completed audits have correct dates

### Issue: Reschedule Count Always 0
**Solution:**
- Verify `reschedule_tracking` table exists
- Check `scheduled_audit_id` parameter is passed correctly

---

## ✅ Deployment Verification Checklist

After deployment, verify:

- [ ] Login works (no rate limit issues)
- [ ] Dashboard loads with Schedule Adherence card
- [ ] Can reschedule checklist (up to 2 times)
- [ ] Can reschedule to past dates
- [ ] Can reschedule to future dates
- [ ] Cannot open scheduled audit before scheduled date
- [ ] Can open scheduled audit on scheduled date
- [ ] Checklist assignment works
- [ ] Role management shows new permissions
- [ ] Mobile app can login
- [ ] Mobile app reschedule works

---

## 📝 Post-Deployment Tasks

1. **Monitor Logs:**
   - Check Azure App Service logs
   - Monitor for errors
   - Check rate limit logs

2. **User Communication:**
   - Inform users about new features
   - Update user documentation
   - Provide training if needed

3. **Performance Monitoring:**
   - Monitor API response times
   - Check database query performance
   - Monitor rate limit usage

---

## 🎉 Success Criteria

Deployment is successful when:
- ✅ All features work in production
- ✅ No errors in logs
- ✅ Users can access all new features
- ✅ Performance is acceptable
- ✅ Mobile app works correctly

---

## 📞 Support

If issues occur:
1. Check Azure App Service logs
2. Check database connection
3. Verify environment variables
4. Review error messages
5. Check rate limit settings

**Ready to deploy! 🚀**

