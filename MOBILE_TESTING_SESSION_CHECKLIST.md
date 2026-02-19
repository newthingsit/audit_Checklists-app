# 📱 Mobile Testing Session - Live Checklist
## Thorough Testing Path (2 Hours)

**Started**: <!-- Add timestamp when you begin -->
**Tester**: <!-- Your name -->
**Server**: http://localhost:3000

---

## ✅ Pre-Testing Setup (5 minutes)

- [ ] Development server running at http://localhost:3000
- [ ] Chrome browser open
- [ ] DevTools open (Press **F12**)
- [ ] Device toolbar enabled (Press **Ctrl+Shift+M**)
- [ ] Optional: Real mobile device connected to same network

---

## 📱 Phase 1: Chrome DevTools Testing (20 minutes)

### Test Device 1: iPhone 12 (375px)

**Viewport**: 375 x 667px

#### Checklists Page (`/checklists`)
- [ ] Page loads without errors (check Console tab)
- [ ] Single-column grid layout (not 3 columns)
- [ ] Cards are full-width and readable
- [ ] Buttons are at least 44x44px and tappable
- [ ] Card actions stack vertically
- [ ] No horizontal scrolling
- [ ] Spacing looks appropriate (12-16px)

**Screenshot**: Take screenshot and save as `test-iphone12-checklists.png`

#### Audit Form Page (`/audit/new/[id]`)
- [ ] Form loads correctly
- [ ] Stepper is vertical orientation (not horizontal)
- [ ] Form fields are full-width
- [ ] Input font size is 16px (check in Inspector - prevents iOS zoom)
- [ ] Action buttons are full-width
- [ ] Bottom action bar is sticky
- [ ] Photo upload button is visible and tappable
- [ ] Signature canvas fits screen

**Screenshot**: Take screenshot and save as `test-iphone12-audit.png`

#### Navigation
- [ ] Menu icon is visible and tappable (44x44px minimum)
- [ ] Drawer opens smoothly
- [ ] Drawer width is appropriate (calc(100vw - 56px))
- [ ] Header height is compact (56px)
- [ ] No layout shift when drawer opens

**Screenshot**: Take screenshot and save as `test-iphone12-nav.png`

---

### Test Device 2: Galaxy S10 (360px) - Extra Small

**Viewport**: 360 x 740px

- [ ] All elements remain visible (nothing cut off)
- [ ] Text is still readable (not too small)
- [ ] Buttons remain tappable
- [ ] No horizontal scroll anywhere
- [ ] Cards have reduced padding (8px - check Inspector)
- [ ] Typography scales down appropriately

**Notes**: Document any issues here

---

### Test Device 3: iPad (768px) - Tablet

**Viewport**: 768 x 1024px

- [ ] Layout uses 2 columns for checklist cards
- [ ] Forms use more horizontal space
- [ ] Navigation drawer becomes permanent (visible always)
- [ ] Typography is larger than mobile
- [ ] Action buttons appear side-by-side (not stacked)
- [ ] Dialogs are centered with margins

**Notes**: Document any issues here

---

### Test Device 4: Custom Breakpoint Testing

Test these specific widths by dragging the viewport or setting custom dimensions:

#### 480px (Small Tablet) <!--  @media (max-width: 480px) -->
- [ ] Buttons shrink slightly (10px 16px padding)
- [ ] H1 font size: 1.5rem
- [ ] Cards have 12px padding

#### 600px (Large Phone) <!-- Material-UI 'sm' breakpoint -->
- [ ] Grid switches from 1 to 2 columns
- [ ] Input base font is 16px
- [ ] Container padding is 12px

#### 960px (Desktop Transition) <!-- @media (max-width: 960px) -->
- [ ] Touch targets are 40x40px minimum
- [ ] Cards have 12px border radius
- [ ] Form fields get hover states

**Notes**: Document any issues here

---

## 🔄 Phase 2: Orientation Testing (10 minutes)

### Portrait → Landscape Switch

For each device (iPhone 12, Galaxy S10, iPad):

1. Start in portrait mode
2. Click the rotate icon in DevTools
3. Verify landscape behavior

#### Landscape Mode Checks (< 800px width)
- [ ] Header height reduces (48px)
- [ ] Container padding reduces (8px)
- [ ] Typography scales down (H4 = 1rem)
- [ ] All content still accessible
- [ ] No weird layout breaks

**Notes**: Document any issues here

---

## ⚡ Phase 3: Performance Testing (15 minutes)

### Lighthouse Audit - Mobile

1. In DevTools, go to **Lighthouse** tab
2. Select:
   - [ ] Mode: Navigation (Default)
   - [ ] Device: Mobile
   - [ ] Categories: Performance, Accessibility, Best Practices, SEO
3. Click **Analyze page load**

#### Target Scores
- [ ] **Performance**: ≥ 85 (Target: 90+)
- [ ] **Accessibility**: ≥ 90 (Target: 95+)
- [ ] **Best Practices**: ≥ 90
- [ ] **SEO**: ≥ 90

**Results**:
```
Performance: ___/100
Accessibility: ___/100
Best Practices: ___/100
SEO: ___/100
```

#### Key Metrics (Record Actual Values)
```
First Contentful Paint (FCP): ___ms (Target: < 1.8s)
Largest Contentful Paint (LCP): ___ms (Target: < 2.5s)
Total Blocking Time (TBT): ___ms (Target: < 200ms)
Cumulative Layout Shift (CLS): ___ (Target: < 0.1)
Speed Index: ___ms (Target: < 3.4s)
```

**Screenshot**: Save Lighthouse report as `lighthouse-mobile-report.png`

---

### Performance - Network Throttling

1. Go to **Network** tab
2. Select throttling: **Fast 3G**
3. Reload page (Ctrl+R)

- [ ] Page loads within 5 seconds
- [ ] No layout breaks during load
- [ ] Images load progressively
- [ ] No console errors

**Load Time**: ___seconds

---

## ♿ Phase 4: Accessibility Testing (10 minutes)

### Keyboard Navigation (Desktop Emulation)
1. Switch to Desktop mode (disable Device Toolbar)
2. Use **Tab** key to navigate

- [ ] All interactive elements are reachable
- [ ] Focus indicators are visible
- [ ] Tab order is logical
- [ ] No keyboard traps
- [ ] Enter/Space activates buttons

### Screen Reader Readiness
1. Inspect elements in DevTools
2. Check for ARIA attributes

- [ ] Buttons have proper labels
- [ ] Forms have associated labels
- [ ] Images have alt text
- [ ] Headings are hierarchical (H1 > H2 > H3)
- [ ] Landmarks are properly used

### Color Contrast
1. In Lighthouse, check **Accessibility** report
2. Look for "Background and foreground colors do not have sufficient contrast"

- [ ] All text has contrast ratio ≥ 4.5:1
- [ ] Large text has ratio ≥ 3:1
- [ ] Interactive elements are distinguishable

**Notes**: Document any issues here

---

## 🎯 Phase 5: Functional Testing (30 minutes)

### User Flow 1: View Checklist Templates
1. Navigate to `/checklists`
2. On mobile device profile (iPhone 12)

- [ ] All templates load and display
- [ ] Template cards are tappable
- [ ] Hover states don't interfere (mobile)
- [ ] Search/filter works (if applicable)
- [ ] Scrolling is smooth

### User Flow 2: Create New Audit
1. Tap on a template card
2. Fill out audit form

- [ ] Form loads without errors
- [ ] All form fields are editable
- [ ] Date pickers work on mobile
- [ ] Dropdowns/selects are mobile-friendly
- [ ] Radio buttons are tappable (44x44px)
- [ ] Checkboxes are tappable
- [ ] Text inputs don't zoom on iOS (16px font)

### User Flow 3: Photo Upload
1. Navigate to photo upload section
2. Test upload functionality

- [ ] Upload button is visible and tappable
- [ ] File picker opens
- [ ] Preview displays correctly
- [ ] Photos fit within mobile viewport
- [ ] Multiple photos supported

### User Flow 4: Signature Capture
1. Navigate to signature section
2. Test signature functionality

- [ ] Canvas is full-width on mobile
- [ ] Touch drawing works smoothly
- [ ] Clear button works
- [ ] Signature looks correct in preview

### User Flow 5: Form Submission
1. Complete all required fields
2. Submit the form

- [ ] Submit button is accessible (sticky bottom bar)
- [ ] Submission works without errors
- [ ] Success message displays correctly
- [ ] Redirect works (if applicable)

### User Flow 6: Navigation
1. Open navigation drawer
2. Test all menu items

- [ ] Drawer opens from left
- [ ] Menu items are tappable
- [ ] Active item is highlighted
- [ ] Drawer closes on selection (mobile)
- [ ] Back button works as expected

**Notes**: Document any issues here

---

## 📱 Phase 6: Real Device Testing (Optional - 15 minutes)

**If you have a real mobile device:**

### Setup
1. Ensure mobile device is on same WiFi as dev machine
2. Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. On mobile browser, navigate to `http://[YOUR-IP]:3000`

Example: `http://192.168.1.100:3000`

### iPhone/iPad Testing
- [ ] Safari: Page loads and functions correctly
- [ ] All interactions work (tap, swipe, scroll)
- [ ] No zoom-on-focus for inputs
- [ ] Safe area insets respected (notch devices)
- [ ] Momentum scrolling feels natural

### Android Testing
- [ ] Chrome: Page loads and functions correctly
- [ ] All interactions work
- [ ] Back button behavior is correct
- [ ] Keyboard doesn't cover inputs
- [ ] Scrolling performance is good

**Device Tested**: 
**OS Version**: 
**Browser**: 
**Notes**: 

---

## 🔍 Phase 7: Cross-Browser Testing (15 minutes)

### Desktop Browsers (Regression Testing)

Ensure mobile changes didn't break desktop:

#### Chrome Desktop
- [ ] Layout is 3-column grid for checklists
- [ ] Forms use horizontal layout
- [ ] All features work as before

#### Firefox Desktop  
- [ ] No layout differences from Chrome
- [ ] All interactions work
- [ ] Console has no errors

#### Edge Desktop
- [ ] Consistent with Chrome
- [ ] No compatibility issues

**Notes**: Document any issues here

---

## 🐛 Issues Found

Use this section to document any bugs or issues:

### Issue 1: [Title]
- **Severity**: Critical / High / Medium / Low
- **Device**: 
- **Viewport**: 
- **Description**: 
- **Steps to Reproduce**:
  1. 
  2. 
  3. 
- **Expected**: 
- **Actual**: 
- **Screenshot**: 

### Issue 2: [Title]
...

---

## ✅ Final Checklist

Before completing testing session:

- [ ] All critical paths tested and working
- [ ] No console errors on any device
- [ ] Performance scores meet targets (≥85)
- [ ] Accessibility scores meet targets (≥90)
- [ ] Screenshots captured for documentation
- [ ] Issues documented with severity levels
- [ ] Testing notes saved for team review
- [ ] Ready to proceed to deployment (if no critical issues)

---

## 📊 Test Summary

**Total Time Spent**: ___hours ___minutes

**Issues Found**:
- Critical: ___
- High: ___
- Medium: ___
- Low: ___

**Overall Status**: ✅ PASS / ⚠️ PASS WITH ISSUES / ❌ FAIL

**Tested By**: _______________
**Date**: _______________
**Approved for Deployment**: YES / NO / NEEDS FIXES

---

## 📝 Additional Notes

Use this space for any additional observations, suggestions, or feedback:

```
[Your notes here]
```

---

## 🚀 Next Steps

Based on test results:

### If ALL PASS ✅
1. Review this checklist with stakeholders
2. Proceed to **MOBILE_DEPLOYMENT_RUNBOOK.md**
3. Deploy to staging environment
4. Final smoke test on staging
5. Deploy to production

### If PASS WITH ISSUES ⚠️
1. Document all issues in project tracker
2. Prioritize:
   - Critical/High: Fix before deployment
   - Medium/Low: Fix in next sprint
3. Re-test after fixes
4. Proceed with deployment when critical items resolved

### If FAIL ❌
1. Review critical issues with development team
2. Create fix plan with timeline
3. Implement fixes
4. Re-run this testing checklist
5. Do not proceed to deployment until resolved

---

**Testing Checklist Version**: 1.0
**Last Updated**: February 19, 2026
**Next Review**: After deployment or major changes
