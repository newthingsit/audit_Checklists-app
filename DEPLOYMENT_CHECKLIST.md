# ✅ Deployment Checklist

Use this checklist to deploy Audit Pro to production.

---

## 📋 Pre-Deployment Checklist

### Code & Configuration
- [ ] All features tested and working
- [ ] No console.log statements in production code
- [ ] Environment variables configured
- [ ] Start from `backend/.env.production.example` (or equivalent App Service settings)
- [ ] Review `PRODUCTION_APP_SETTINGS_TEMPLATE.md` for copy/paste baseline values
- [ ] Run `cd backend && npm run env:check:prod` and resolve all reported errors
- [ ] API URLs updated for production
- [ ] Version numbers updated

### Security
- [ ] Strong JWT_SECRET generated (64+ characters)
- [ ] Database passwords are secure
- [ ] CORS configured for production domains only
- [ ] HTTPS enabled

---

## ☁️ Azure Deployment

### Step 1: Create Azure Account
- [ ] Sign up at https://azure.microsoft.com/free/
- [ ] Claim $200 free credit
- [ ] Install Azure CLI

### Step 2: Create Resources
```bash
# Login
az login

# Create Resource Group
az group create --name audit-app-rg --location eastus
```

### Step 3: Deploy Database
- [ ] Create Azure SQL Server
- [ ] Create database `audit_checklists`
- [ ] Configure firewall rules
- [ ] Note connection string

### Step 4: Deploy Backend
- [ ] Create App Service (B1 plan)
- [ ] Configure environment variables
- [ ] Set `JWT_SECRET` to a strong random value (64+ chars, not placeholder text)
- [ ] Set `ALLOWED_ORIGINS` to production web domains
- [ ] Set `TRUST_PROXY=true`
- [ ] Set `FORCE_HTTPS=true`
- [ ] Set SQL TLS flags (`MSSQL_ENCRYPT`, `MSSQL_TRUST_CERT`) based on your SQL certificate setup
- [ ] Set `ENHANCED_PDF_TIMEOUT_MS` (recommended: `15000`)
- [ ] Set `REPORT_DATA_TIMEOUT_MS` (recommended: `10000`)
- [ ] Enable build during deploy (`SCM_DO_BUILD_DURING_DEPLOYMENT=true`)
- [ ] Ensure ZIP deploy excludes `node_modules`
- [ ] Deploy code via GitHub Actions or ZIP
- [ ] Test API endpoints

### Step 5: Deploy Frontend
- [ ] Create Static Web App
- [ ] Connect to GitHub repository
- [ ] Configure build settings
- [ ] Test web app

### Step 6: Configure Storage
- [ ] Create Storage Account
- [ ] Create blob container for photos
- [ ] Update backend with storage credentials

---

## 📱 Mobile App Deployment

### Step 1: Expo Setup
- [ ] Create Expo account at https://expo.dev
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login: `eas login`
- [ ] Configure project: `eas build:configure`

### Step 2: Update Configuration
Edit `mobile/app.json`:
- [ ] Update `expo.extra.eas.projectId`
- [ ] Update `expo.extra.apiUrl.production` to Azure URL
- [ ] Update `expo.owner` to your Expo username

### Step 3: Build Apps
```bash
# Preview build (for testing)
eas build --platform android --profile preview

# Production build
eas build --platform all --profile production
```

### Step 4: App Store Accounts
- [ ] Google Play Console ($25 one-time)
- [ ] Apple Developer Program ($99/year)

### Step 5: Submit to Stores
```bash
# Android
eas submit --platform android

# iOS
eas submit --platform ios
```

---

## 🔧 Post-Deployment

### Monitoring
- [ ] Set up Application Insights (Azure)
- [ ] Configure error tracking (Sentry)
- [ ] Set up uptime monitoring
- [ ] Verify backend health check returns 200 (`/api/health`)
- [ ] Review App Service log stream after deploy

### Backup
- [ ] Enable Azure SQL automated backups
- [ ] Configure blob storage redundancy

### Documentation
- [ ] Update README with production URLs
- [ ] Document admin credentials securely
- [ ] Create user guide

---

## 🔗 Quick Links

| Resource | URL |
|----------|-----|
| Azure Portal | https://portal.azure.com |
| Expo Dashboard | https://expo.dev |
| Google Play Console | https://play.google.com/console |
| App Store Connect | https://appstoreconnect.apple.com |

---

## 📞 Support Contacts

| Issue | Contact |
|-------|---------|
| Azure Support | Azure Portal → Help + Support |
| Expo Support | https://expo.dev/support |
| App Store Review | App Store Connect |
| Play Store Review | Google Play Console |

---

## 🎉 Launch Checklist

Final checks before going live:

- [ ] All API endpoints working
- [ ] User registration/login working
- [ ] Audit creation working
- [ ] Photo upload working
- [ ] Offline mode working (mobile)
- [ ] Push notifications working (mobile)
- [ ] Admin dashboard accessible
- [ ] Reports generating correctly
- [ ] Email notifications working (if configured)

**Ready to launch! 🚀**
