# Phase 5: Deployment & Verification - Complete Guide

## Pre-Deployment Verification

### 1. Code Quality Checks

```bash
# TypeScript compilation
npx tsc --noEmit

# Expected output: No errors

# ESLint checks
npm run lint

# Expected: All files pass linting

# Test suite
npm test -- --coverage

# Expected: All tests passing, 50%+ coverage
```

### 2. Build Verification

```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build

# Expected: Build succeeds, no errors

# Check build output
ls -lah dist/
# Should show: main.[hash].js, main.[hash].css

# Verify assets
du -sh dist/
# Should be < 500KB for web
```

### 3. Security Checks

```bash
# Audit dependencies
npm audit

# Expected: No critical vulnerabilities

# Check for hardcoded credentials
grep -r "API_KEY\|SECRET\|PASSWORD" src/

# Expected: No results (only in env.example or docs)

# Verify environment variables
cat .env.production | grep -v "^#"

# Expected: All required vars present
```

## Web Deployment

### Option 1: Azure Static Web Apps (Recommended)

```bash
# 1. Create resource group
az group create --name audit-app-rg --location eastus

# 2. Create Static Web App
az staticwebapp create \
  --name audit-app-web \
  --resource-group audit-app-rg \
  --source https://github.com/newthingsit/audit_Checklists-app \
  --branch main \
  --location eastus

# 3. Deploy
npm run build
az staticwebapp publish --name audit-app-web dist/

# 4. Configure API routes
# Create staticwebapp.config.json
{
  "routes": [
    {
      "route": "/api/*",
      "serve": "/api/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/[TENANT_ID]/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  }
}
```

### Option 2: Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Follow prompts to configure

# 4. Set environment variables
vercel env add

# 5. Deploy to production
vercel --prod
```

### Option 3: Netlify

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Connect repository
netlify auth login
netlify init

# 3. Configure build settings
# Build command: npm run build
# Publish directory: dist/

# 4. Deploy
netlify deploy --prod
```

## Mobile Deployment

### iOS - TestFlight

```bash
# 1. Build for iOS
eas build --platform ios

# 2. Configure for TestFlight
# Update app.json:
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.newthings.auditchecklist",
      "buildNumber": "1.0.0"
    }
  }
}

# 3. Submit to TestFlight
eas submit --platform ios

# 4. Share build link with testers
# Check email for TestFlight link
```

### Android - Google Play

```bash
# 1. Build for Android
eas build --platform android

# 2. Configure for Play Store
# Update app.json:
{
  "expo": {
    "android": {
      "package": "com.newthings.auditchecklist",
      "versionCode": 1
    }
  }
}

# 3. Submit to Play Store
eas submit --platform android

# 4. Configure Play Store listing
# - Add screenshots
# - Write description
# - Set content rating
# - Configure pricing

# 5. Release to production
# Play Store Console → Release → Production
```

## Post-Deployment Verification

### 1. Functionality Testing

```typescript
// Test critical flows
const testCriticalFlows = async () => {
  // 1. Create audit
  const audit = await createAudit({
    auditName: 'Test Audit',
    createdDate: new Date().toISOString(),
    categories: [],
  });
  expect(audit.id).toBeDefined();

  // 2. Add category
  const category = await addCategory(audit.id, {
    name: 'Safety',
    items: [],
  });
  expect(category.id).toBeDefined();

  // 3. Submit audit
  const result = await submitAudit(audit.id);
  expect(result.success).toBe(true);

  // 4. Generate report
  const report = await generateReport(audit.id);
  expect(report.data).toBeDefined();
};
```

### 2. Performance Monitoring

```bash
# Web Performance
curl -w "@curl-format.txt" https://audit-app.azurewebsites.net/

# Expected:
# Time to Connect: < 100ms
# Time to First Byte: < 500ms
# Time to Complete: < 2s

# Mobile Performance
# Run on actual device for accurate measurements
```

### 3. Error Tracking Setup

```typescript
// Sentry integration
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Catch errors
Sentry.captureException(error);
```

### 4. Monitoring & Alerts

```json
// Application Insights (Azure)
{
  "alerts": [
    {
      "name": "High Error Rate",
      "condition": "error_rate > 5%",
      "action": "send_email"
    },
    {
      "name": "High Response Time",
      "condition": "response_time > 2000ms",
      "action": "send_email"
    },
    {
      "name": "Low Availability",
      "condition": "availability < 99%",
      "action": "send_email"
    }
  ]
}
```

## Data Migration & Backup

### 1. Database Backup

```bash
# SQL Server backup
sqlcmd -S [server] -U [user] -P [password] \
  -Q "BACKUP DATABASE [audit_db] TO DISK='backup.bak'"

# Verify backup
sqlcmd -S [server] -U [user] -P [password] \
  -Q "RESTORE FILELISTONLY FROM DISK='backup.bak'"
```

### 2. Data Import

```typescript
// CSV import to database
const importAudits = async (csvPath: string) => {
  const data = await parseCSV(csvPath);
  
  for (const row of data) {
    await db.audits.create({
      auditName: row.name,
      createdDate: row.date,
      location: row.location,
    });
  }
};
```

## Rollback Plan

### If Deployment Fails

```bash
# Web - Revert to previous version
git revert HEAD
npm run build
az staticwebapp publish --name audit-app-web dist/

# Verify rollback
curl https://audit-app.azurewebsites.net/health
# Expected: { status: "ok", version: "1.0.0" }
```

## Success Criteria Checklist

- [ ] All TypeScript errors resolved
- [ ] All tests passing (50%+ coverage)
- [ ] No console warnings/errors
- [ ] Security audit passed
- [ ] Performance targets met:
  - [ ] Web: TTI < 3 seconds
  - [ ] Mobile: Startup < 2 seconds
  - [ ] Bundle size: < 500KB (web)
- [ ] Functionality tests passed
- [ ] Error tracking enabled
- [ ] Monitoring alerts configured
- [ ] Data backed up
- [ ] Team notified
- [ ] Documentation updated

## Post-Launch Monitoring

### Week 1
- [ ] Monitor error logs daily
- [ ] Check performance metrics
- [ ] Respond to user feedback
- [ ] Fix any critical bugs
- [ ] Verify data integrity

### Week 2-4
- [ ] Analyze usage patterns
- [ ] Optimize based on real usage
- [ ] Gather improvement requests
- [ ] Plan Phase 6 features
- [ ] Document learnings

## Deployment Checklist by Component

### Before Deployment
- [ ] Code committed and pushed
- [ ] CI/CD pipeline passed
- [ ] Tests executed successfully
- [ ] Code reviewed by team
- [ ] Documentation up-to-date

### Web Application
- [ ] Build successful
- [ ] Static assets optimized
- [ ] API endpoints configured
- [ ] Database migrations run
- [ ] CORS configured
- [ ] SSL certificate valid

### Mobile Applications
- [ ] iOS build signed
- [ ] Android build signed
- [ ] TestFlight build distributed
- [ ] Play Store listing complete
- [ ] Version numbers updated
- [ ] Release notes prepared

### Post-Deployment
- [ ] Production verified
- [ ] Errors tracked
- [ ] Performance monitored
- [ ] Users notified
- [ ] Team debriefed
- [ ] Lessons documented

## Communication Plan

### Internal Team
```
Subject: Audit Checklist App v2.0 - Deployment Complete

The application has been successfully deployed to production:

📱 Mobile App
- iOS: Available on TestFlight (link)
- Android: Available on Play Store (link)

🌐 Web Application
- URL: https://audit-app.azurewebsites.net
- Status: ✅ Operational

📊 Key Metrics
- Performance: ✅ All targets met
- Uptime: ✅ 99.9%
- Users: ✅ Can access

For issues, contact: support@newthings.com
```

### External Users
```
Subject: Audit Checklist App - New Version Available

We're excited to announce the latest version with improvements:

✨ New Features
- Improved category navigation
- Better performance
- Enhanced mobile experience

📲 Update Now
- iOS: Update from App Store
- Android: Update from Play Store

📧 Questions? support@newthings.com
```

---

**Deployment Status**: READY
**Target Go-Live**: [DATE]
**Estimated Downtime**: 0-5 minutes
**Rollback Available**: Yes
**Support Team**: Alerted & Ready
