# 🚀 Final PRD Deployment Guide - All Platforms

## ✅ Code Status

**Commit:** `92e14ee` - "fix: Schedule Adherence permission and mobile app enhancements"  
**Branch:** `master`  
**Status:** ✅ Pushed to repository

---

## 📦 What's Being Deployed

### All Features (Web + Mobile + Backend)
1. ✅ **Individual Checklist Rescheduling** (2 times per checklist)
2. ✅ **Backdated & Future Dates** for rescheduling
3. ✅ **Same-Day Validation** for scheduled audits
4. ✅ **Schedule Adherence** metric in dashboard (Web + Mobile)
5. ✅ **Checklist Assignment User-Wise**
6. ✅ **Rate Limit Fixes** (20→100 for login)
7. ✅ **Role Management Updates** with `view_schedule_adherence` permission
8. ✅ **Permission Fixes** for Schedule Adherence visibility

---

## 🎯 Deployment Steps for All Platforms

### Step 1: Backend Deployment (Azure App Service)

**Option A: Automatic via GitHub Actions**
- If configured, deployment triggers automatically on push
- Check GitHub Actions tab for status

**Option B: Manual ZIP Deploy**
```bash
# 1. Create ZIP of backend folder (excluding node_modules)
cd backend
zip -r ../backend-deploy.zip . -x "node_modules/*" "*.log" ".env" ".git/*"

# 2. Deploy via Azure Portal
# - Azure Portal → App Services → audit-app-backend-2221
# - Deployment Center → ZIP Deploy
# - Upload backend-deploy.zip
```

**Option C: Azure CLI**
```bash
cd backend
az webapp deployment source config-zip \
  --resource-group audit-app-rg \
  --name audit-app-backend-2221 \
  --src backend-deploy.zip
```

**⚠️ CRITICAL: Restart Backend Server**
1. Azure Portal → App Services → `audit-app-backend-2221`
2. Click **Restart** button
3. Wait ~30 seconds
4. **Why:** Rate limit changes require server restart

---

### Step 2: Frontend/Web App Deployment (Azure Static Web App)

**Option A: Automatic via GitHub Actions**
- Push to master triggers automatic deployment
- Check GitHub Actions for build status

**Option B: Manual Build & Deploy**
```bash
cd web
npm install
npm run build

# Upload build folder to Static Web App via Azure Portal
# - Azure Portal → Static Web Apps → audit-app-frontend
# - Deployment Center → Upload build folder
```

**Option C: Azure CLI**
```bash
cd web
npm install
npm run build
az staticwebapp deploy \
  --name audit-app-frontend \
  --resource-group audit-app-rg \
  --source-location build
```

---

### Step 3: Mobile App Deployment

**For Testing (Development Build)**
```bash
cd mobile
npm install

# For Android
npx expo run:android

# For iOS
npx expo run:ios
```

**For Production (EAS Build)**
```bash
cd mobile

# 1. Update app.json with production API URL if needed
# Check: mobile/app.json → expo.extra.apiUrl.production

# 2. Build for production
eas build --platform all --profile production

# 3. Submit to app stores (after testing)
eas submit --platform android
eas submit --platform ios
```

**Important Mobile App Configuration:**
- Verify `mobile/app.json` has correct production API URL
- Ensure `expo.extra.apiUrl.production` points to your Azure backend
- Example: `https://audit-app-backend-2221.azurewebsites.net/api`

---

## 🔍 Post-Deployment Verification

### Backend API Tests

```bash
# Test Schedule Adherence endpoint
curl https://audit-app-backend-2221.azurewebsites.net/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Should return:
# {
#   "scheduleAdherence": {
#     "total": 20,
#     "onTime": 17,
#     "adherence": 85
#   }
# }
```

### Web App Verification

1. ✅ Open web app URL
2. ✅ Login successfully
3. ✅ Check Dashboard for Schedule Adherence card (if user has permission)
4. ✅ Navigate to Scheduled Audits
5. ✅ Test reschedule functionality (should allow 2 times per checklist)
6. ✅ Test backdated rescheduling
7. ✅ Test same-day validation (try opening scheduled audit on wrong date)
8. ✅ Verify role management shows `view_schedule_adherence` permission

### Mobile App Verification

1. ✅ Update API URL in `mobile/app.json` if needed
2. ✅ Build and install mobile app
3. ✅ Test login (should not hit rate limit)
4. ✅ Check Dashboard for Schedule Adherence card (if user has permission)
5. ✅ Test reschedule functionality
6. ✅ Test same-day validation (try starting scheduled audit on wrong date)
7. ✅ Verify error messages are clear

---

## 📋 Deployment Checklist

### Pre-Deployment
- [x] All code committed and pushed
- [x] CHANGELOG updated
- [x] No console.log statements in production code
- [x] Environment variables configured

### Backend Deployment
- [ ] Backend deployed to Azure App Service
- [ ] Backend server restarted (CRITICAL for rate limits)
- [ ] API endpoints responding correctly
- [ ] Schedule Adherence data returning in analytics endpoint

### Web App Deployment
- [ ] Frontend deployed to Azure Static Web App
- [ ] Web app loads without errors
- [ ] Schedule Adherence card visible (with permission)
- [ ] All features working

### Mobile App Deployment
- [ ] Mobile app API URL configured
- [ ] Mobile app built (development or production)
- [ ] Mobile app tested on device
- [ ] Schedule Adherence card visible (with permission)
- [ ] All features working

### Post-Deployment
- [ ] All platforms tested
- [ ] No errors in logs
- [ ] Users can access new features
- [ ] Permissions working correctly

---

## 🐛 Troubleshooting

### Issue: Schedule Adherence Not Showing

**Web App:**
- Check user has `view_schedule_adherence` or `view_analytics` permission
- Verify analytics API returns `scheduleAdherence` data
- Check browser console for errors

**Mobile App:**
- Check user has `view_schedule_adherence` or `view_analytics` permission
- Verify analytics API call is successful
- Check mobile app logs for errors

**Backend:**
- Verify `/api/analytics/dashboard` endpoint returns `scheduleAdherence`
- Check database has scheduled audits with completed status
- Verify date comparison logic

### Issue: Rate Limit Still Blocking

**Solution:**
- Restart backend server (Step 1 above)
- Verify `backend/server.js` has rate limit set to 100
- Clear rate limit counters if needed

### Issue: Same-Day Validation Not Working

**Web App:**
- Check `web/src/pages/AuditForm.js` has validation logic
- Verify scheduled date is being checked correctly

**Mobile App:**
- Check `mobile/src/screens/ScheduledAuditsScreen.js` has `canStartSchedule` validation
- Verify date comparison is working

**Backend:**
- Verify `backend/routes/audits.js` has same-day validation
- Check error messages are being returned

### Issue: Reschedule Count Always 0

**Solution:**
- Verify `reschedule_tracking` table exists
- Check `scheduled_audit_id` is being passed correctly
- Verify database connection

---

## 📊 Files Changed Summary

### Backend (6 files)
- `backend/routes/scheduled-audits.js` - Reschedule logic
- `backend/routes/audits.js` - Same-day validation
- `backend/routes/analytics.js` - Schedule Adherence
- `backend/routes/roles.js` - Permission updates
- `backend/routes/auth.js` - Error messages
- `backend/server.js` - Rate limit fixes

### Web App (2 files)
- `web/src/pages/Dashboard.js` - Schedule Adherence card + permission fix
- `web/src/pages/AuditForm.js` - Same-day validation UI

### Mobile App (3 files)
- `mobile/src/screens/DashboardScreen.js` - Schedule Adherence card
- `mobile/src/screens/ScheduledAuditsScreen.js` - Same-day validation
- `mobile/src/services/ApiService.js` - Error handling (already done)
- `mobile/src/screens/LoginScreen.js` - Error messages (already done)

---

## 🔧 Configuration Required

### Backend Environment Variables
Verify in Azure App Service Configuration:
- `NODE_ENV=production`
- `DB_TYPE=mssql` (or your database type)
- `JWT_SECRET` (strong secret)
- `CORS_ORIGINS` (frontend URL)
- Rate limit: 100 for login (production)

### Web App Environment Variables
- `REACT_APP_API_URL` (backend API URL)
- Update in `web/.env.production` if needed

### Mobile App Configuration
- `mobile/app.json` → `expo.extra.apiUrl.production`
- Should point to: `https://audit-app-backend-2221.azurewebsites.net/api`

---

## ✅ Success Criteria

Deployment is successful when:
- ✅ All platforms deployed without errors
- ✅ Schedule Adherence visible on web and mobile dashboards (with permission)
- ✅ Reschedule works (per-checklist, 2 times limit)
- ✅ Backdated rescheduling works
- ✅ Same-day validation works
- ✅ Mobile app can login without rate limit issues
- ✅ No errors in Azure logs
- ✅ Users can access all new features

---

## 📞 Support

If issues occur:
1. Check Azure App Service logs (Log stream)
2. Verify environment variables
3. Check database connectivity
4. Review error messages in browser console (web)
5. Check mobile app logs (React Native debugger)
6. Verify permissions are assigned correctly

---

## 🎉 Ready for PRD!

All code changes are committed and pushed. Follow the steps above to complete deployment for all platforms.

**Estimated Deployment Time:**
- Backend: 5-10 minutes
- Web App: 5-10 minutes
- Mobile App: 15-30 minutes (build time)

**Total: ~30-50 minutes**

---

**Deployment Order:**
1. Backend → Restart server
2. Web App → Verify
3. Mobile App → Build & Test

**Good luck with the deployment! 🚀**

