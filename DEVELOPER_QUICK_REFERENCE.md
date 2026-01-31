# 🎯 Developer Quick Reference Card

**Print this and keep at your desk!**

---

## 📍 Quick Links

| Need | File | Time |
|------|------|------|
| 5-min overview | [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) | 5 min |
| Deploy web/mobile | [DEPLOYMENT_READY.md](DEPLOYMENT_READY.md) | 15 min |
| Test properly | [COMPREHENSIVE_TESTING_GUIDE.md](COMPREHENSIVE_TESTING_GUIDE.md) | 30 min |
| Code standards | [BEST_PRACTICES.md](BEST_PRACTICES.md) | Reference |
| Setup TypeScript | [PHASE_1_IMPLEMENTATION_GUIDE.md](PHASE_1_IMPLEMENTATION_GUIDE.md) | 1 hour |
| Strategic plan | [STRATEGIC_IMPROVEMENT_ROADMAP.md](STRATEGIC_IMPROVEMENT_ROADMAP.md) | 10 min |
| Technical details | [AUTO_CATEGORY_NAVIGATION_FIX.md](AUTO_CATEGORY_NAVIGATION_FIX.md) | 10 min |
| All deliverables | [EXPERT_IMPLEMENTATION_SUMMARY.md](EXPERT_IMPLEMENTATION_SUMMARY.md) | 20 min |

---

## 🚀 Deployment Checklist

### Pre-Deployment (30 min)
```bash
# Mobile
cd mobile && npm run build && npm run lint

# Web
cd web && npm run build && npm run lint

# Check no errors? ✅ Continue to next step
```

### Web Deployment
```bash
# Copy build files
cp -r web/build/* /path/to/production/server

# Test
curl https://your-domain.com
# Check console for: [AuditForm] Auto-selecting...
```

### Mobile Deployment
```bash
# Download APK
eas build:download 7e305da7-571a-4a6d-bf8f-67a70c9e033e

# Upload to Play Store (Google Play Console)
# Or Firebase: firebase appdistribution:distribute app-release.apk
```

### Post-Deployment (1 hour)
- [ ] Web loads without errors
- [ ] Mobile installs without errors
- [ ] Test: Single category audit works
- [ ] Test: Two category audit works
- [ ] Test: No category repetition
- [ ] Check console logs
- [ ] Monitor error logs (24 hours)

---

## 💻 Common Git Commands

```bash
# Check status
git status

# View changes
git diff

# Stage files
git add .

# Commit
git commit -m "type(scope): description"
# Examples:
git commit -m "fix(audit): auto-select incomplete category"
git commit -m "feat(mobile): extract category component"
git commit -m "test(utils): add auditHelpers tests"
git commit -m "docs: update deployment guide"

# Push
git push origin feature-branch

# Pull latest
git pull origin master

# Create new branch
git checkout -b feature/my-feature

# View log
git log --oneline -n 10

# Revert commit
git revert <commit-hash>
```

---

## 📦 Using Shared Utilities

### Import in Mobile
```javascript
import {
  calculateCategoryCompletionStatus,
  getFirstIncompleteCategory
} from "@shared/utils/auditHelpers";

import {
  validateAuditItem,
  validateLocation
} from "@shared/utils/formValidation";

import {
  AuditStatus,
  LOCATION_CONSTRAINTS,
  ERROR_CODES
} from "@shared/constants/auditConstants";
```

### Import in Web
```javascript
import {
  calculateCategoryCompletionStatus,
  getFirstIncompleteCategory
} from "@shared/utils/auditHelpers";

import {
  validateAuditItem,
  validateFileUpload
} from "@shared/utils/formValidation";

import {
  AuditStatus,
  FILE_UPLOAD_CONSTRAINTS,
  ERROR_MESSAGES
} from "@shared/constants/auditConstants";
```

### Usage Examples
```javascript
// Calculate completion
const status = calculateCategoryCompletionStatus(categories, items);
// Output: { SERVICE: { completed: 3, total: 4, isComplete: false } }

// Get next category
const nextCat = getFirstIncompleteCategory(categories, status);

// Validate item
const result = validateAuditItem(item);
if (!result.isValid) {
  showError(result.errors[0].message);
}

// Use constants
if (distance > LOCATION_CONSTRAINTS.MAX_DISTANCE_METERS) {
  showError(ERROR_MESSAGES[ERROR_CODES.LOCATION_TOO_FAR]);
}
```

---

## 🧪 Testing Commands

```bash
# Run all tests
npm test

# Run specific file
npm test auditHelpers.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Run mobile tests
cd mobile && npm test

# Run web tests
cd web && npm test
```

---

## 🔍 Debug Quick Tips

### Browser Console (Web)
```javascript
// Expected logs
[AuditForm] Auto-selecting first incomplete category: SERVICE

// Check for errors
// Open DevTools → Console tab
// Look for red errors

// Check network
// Open DevTools → Network tab
// Look for API calls: /api/audit
// Check response status (200 = OK)
```

### Mobile Console (Expo)
```bash
# Start with logging
expo start --android

# Check logs
# Look for: [AuditForm] Auto-selecting...

# View specific device logs
adb logcat | grep AuditForm
```

### API Testing
```bash
# Test API endpoint
curl -X GET https://api.your-domain.com/api/audit/123

# Test with auth header
curl -X GET https://api.your-domain.com/api/audit/123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check response
# Status code 200 = OK
# Status code 401 = Unauthorized
# Status code 404 = Not found
# Status code 500 = Server error
```

---

## 🏗️ File Structure Quick Reference

```
audit-checklists-app/
├── shared/               ← Shared between mobile & web
│   ├── utils/           ← Reusable functions
│   │   ├── auditHelpers.ts
│   │   └── formValidation.ts
│   └── constants/       ← Enums & constants
│       └── auditConstants.ts
│
├── mobile/              ← React Native app
│   └── src/
│       ├── screens/     ← Screen components
│       ├── components/  ← Reusable components
│       ├── hooks/       ← Custom hooks
│       ├── utils/       ← Local utilities
│       └── context/     ← React Context
│
├── web/                 ← React web app
│   └── src/
│       ├── pages/       ← Page components
│       ├── components/  ← Reusable components
│       ├── hooks/       ← Custom hooks
│       ├── utils/       ← Local utilities
│       └── context/     ← React Context
│
└── docs/                ← Documentation (these files!)
```

---

## 📝 Naming Conventions Quick Guide

| Type | Format | Example |
|------|--------|---------|
| Component | PascalCase | `CategorySelector.js` |
| Hook | use + PascalCase | `useAuditData.js` |
| Utility | camelCase | `auditHelpers.js` |
| Constant | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| Variable | camelCase | `auditId`, `isComplete` |
| Function | camelCase | `calculateTotal()` |
| Enum | PascalCase | `AuditStatus.COMPLETED` |
| Private | _camelCase | `_validateEmail()` |
| Event handler | on + PascalCase | `onCategorySelect` |

---

## 🚨 Common Issues & Fixes

### "Cannot find module @shared/..."
```bash
# Fix: Verify tsconfig.json paths
# Check: File exists in shared/ folder
# Test: npm run build (should work)
```

### Category Still Repeating
```bash
# Fix: Clear cache
# Mobile: Expo go → Reload app
# Web: DevTools → Cache → Clear
# Re-test
```

### API 500 Error
```bash
# Fix: Check backend logs
# Test: curl http://localhost:3000/api/audit
# Verify: Database running
# Verify: API routes configured
```

### Build Fails with TypeScript Error
```bash
# Fix: Check line number in error
# Fix: Add @ts-ignore if necessary (temporary)
// @ts-ignore
const data = any_value;
# Fix: Install type package if missing
npm install --save-dev @types/react
```

### App Won't Install on Mobile
```bash
# Fix: Clear existing app
adb shell pm clear com.audit

# Fix: Check minimum API level (28+)
# Fix: Check storage available (50MB+)

# Reinstall
adb install app-release.apk
```

---

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Review QUICK_START_GUIDE | 5 min |
| Download mobile APK | 10 min |
| Deploy web build | 15 min |
| Deploy mobile APK | 20 min |
| Run test suite | 30 min |
| Setup TypeScript | 2 hours |
| Extract one component | 1 hour |
| Create test file | 1 hour |
| TypeScript migration (all files) | 1 week |
| Component refactoring (Phase 1) | 2 weeks |

---

## 📊 Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Page Load | < 3s | > 5s | > 10s |
| Form Interaction | < 100ms | > 500ms | > 2s |
| API Response | < 2s | > 5s | > 10s |
| Category Selection | < 100ms | > 500ms | > 1s |
| Component Render | < 16ms | > 100ms | > 500ms |

---

## 🎯 Success Indicators

**Fix is Working If**:
- ✅ No category shows twice
- ✅ Categories appear in order selected
- ✅ Console shows `[AuditForm] Auto-selecting...`
- ✅ Audit completion works smoothly
- ✅ No errors in browser console

**Deployment is Successful If**:
- ✅ Web page loads
- ✅ Mobile app opens
- ✅ Forms work correctly
- ✅ No console errors
- ✅ API calls successful

---

## 💡 Pro Tips

1. **Before committing**: `npm run lint` & `npm test`
2. **Check console logs**: `[AuditForm]` messages help debugging
3. **Use DevTools**: Network tab to monitor API calls
4. **Test on device**: Browser emulators don't catch everything
5. **Read the docs**: Most questions answered in BEST_PRACTICES.md
6. **Commit often**: Small commits easier to review and revert
7. **Ask for help**: Better to ask than spend hours confused

---

## 🔗 Key URLs

| Purpose | URL |
|---------|-----|
| EAS Build Dashboard | https://expo.dev/dashboard |
| Google Play Console | https://play.google.com/console |
| GitHub Repository | [Your repo URL] |
| Production Web | https://your-domain.com |
| Staging Web | https://staging.your-domain.com |
| API Documentation | [Your API docs] |

---

## 📞 Key Contacts

| Role | Person | Contact |
|------|--------|---------|
| Team Lead | [Name] | [Email/Slack] |
| DevOps | [Name] | [Email/Slack] |
| Backend Lead | [Name] | [Email/Slack] |
| QA Lead | [Name] | [Email/Slack] |

---

## 📚 Documentation at a Glance

```
Quick Question? → QUICK_START_GUIDE.md
How to deploy? → DEPLOYMENT_READY.md
How to test? → COMPREHENSIVE_TESTING_GUIDE.md
Code standards? → BEST_PRACTICES.md
Setup TypeScript? → PHASE_1_IMPLEMENTATION_GUIDE.md
What's the plan? → STRATEGIC_IMPROVEMENT_ROADMAP.md
What changed? → AUTO_CATEGORY_NAVIGATION_FIX.md
What's done? → EXPERT_IMPLEMENTATION_SUMMARY.md
```

---

## ✅ Today's Checklist

- [ ] Read this card (5 min)
- [ ] Read QUICK_START_GUIDE.md (5 min)
- [ ] Download mobile APK (10 min)
- [ ] Deploy web build (15 min)
- [ ] Run quick tests (30 min)
- [ ] Monitor production (ongoing)

---

**Print & Bookmark This Card!** 🎯

Keep it handy for quick reference during development.

*Last Updated*: [Current Session]
*Version*: 1.0
*Status*: ✅ Ready to Use
