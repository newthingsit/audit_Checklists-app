# Version 1.13.0 - Mobile App Profile & Navigation Enhancements

**Release Date:** December 3, 2025  
**Status:** ✅ Complete

## Overview

This version focuses on enhancing the mobile app user experience with functional profile settings, improved audit filtering, and better navigation flow after login/logout.

## Features Implemented

### 1. Security Settings with Password Change ✅

#### Problem
- Security option in Profile was non-functional (button did nothing)
- Users could not change their password from the mobile app

#### Solution
- **Security Modal**: Added full-featured password change modal
- **Password Validation**: Validates current password, minimum 6 characters, confirmation match
- **Visibility Toggle**: Show/hide password for all three password fields
- **Backend API**: Added `PUT /api/auth/change-password` endpoint

**Files Modified:**
- `mobile/src/screens/ProfileScreen.js` - Added Security modal with password change form
- `backend/routes/auth.js` - Added `/change-password` endpoint

### 2. Appearance Settings ✅

#### Problem
- Appearance option in Profile was non-functional

#### Solution
- **Appearance Modal**: Shows current theme with options
- **Light Mode**: Currently active (indicated with checkmark)
- **Dark Mode**: Marked as "Coming Soon"
- **System Default**: Marked as "Coming Soon"

**Files Modified:**
- `mobile/src/screens/ProfileScreen.js` - Added Appearance modal

### 3. About Section ✅

#### Problem
- About option in Profile was non-functional

#### Solution
- **About Modal**: Comprehensive app information display
- **App Logo**: Gradient logo with checkmark icon
- **Version Info**: Dynamic version from Expo config
- **Build Details**: SDK version, platform (iOS/Android)
- **Website Link**: Opens LiteBite Foods website
- **Copyright**: Company attribution

**Files Modified:**
- `mobile/src/screens/ProfileScreen.js` - Added About modal with dynamic info

### 4. Audit History - In Progress Filter ✅

#### Problem
- Filter options showed: All, Completed, Pending, Failed
- Missing "In Progress" status filter

#### Solution
- **Added "In Progress" Filter**: New filter option in status list
- **Distinct Styling**: In Progress has blue/info color scheme (separate from Pending's yellow)
- **Filter Options**: Now shows All, Completed, In Progress, Pending, Failed

**Files Modified:**
- `mobile/src/screens/AuditHistoryScreen.js` - Added 'in_progress' to filter options, updated getStatusStyles

### 5. Logout Button Relocation ✅

#### Problem
- Logout button was at the bottom of the Profile screen
- Not easily accessible

#### Solution
- **Header Placement**: Logout button now in top-right corner of profile header
- **Visual Design**: Circular button with semi-transparent background
- **Icon**: Logout icon for clear identification
- **Removed**: Old logout section at bottom

**Files Modified:**
- `mobile/src/screens/ProfileScreen.js` - Moved logout to header, updated styles

### 6. Dashboard Opens After Login ✅

#### Problem
- After logout and re-login, app opened to Profile screen instead of Dashboard
- Navigation state persisted from previous session

#### Solution
- **Initial Route**: Set `initialRouteName="Dashboard"` on Tab Navigator
- **Navigation Reset**: Added navigation ref to reset state on login
- **Automatic Reset**: When user becomes authenticated, navigation resets to Dashboard

**Files Modified:**
- `mobile/App.js` - Added navigation ref and reset logic
- `mobile/src/navigation/AppStack.js` - Added initialRouteName="Dashboard"

## Technical Details

### New Backend Endpoint

```javascript
// PUT /api/auth/change-password
// Request: { currentPassword, newPassword }
// Response: { message: "Password changed successfully" }
```

**Validation:**
- Current password verification
- New password minimum 6 characters
- Bcrypt password hashing

### Mobile App Changes

#### ProfileScreen.js
- Added Modal imports
- Added Linking for website link
- Added Constants for version info
- New state variables for modals and password fields
- Password visibility toggles
- Three new modals (Security, Appearance, About)
- Header logout button
- Updated styles

#### AuditHistoryScreen.js
- Added 'in_progress' to filter array
- Updated getStatusStyles for distinct In Progress styling

#### App.js
- Added navigation ref
- Added useEffect for navigation reset on login

#### AppStack.js
- Added initialRouteName="Dashboard"

## Testing Checklist

### Security Modal
- [x] Opens when tapping Security option
- [x] Current password field works
- [x] New password field works
- [x] Confirm password field works
- [x] Password visibility toggles work
- [x] Validation prevents empty fields
- [x] Validation requires 6+ characters
- [x] Validation checks password match
- [x] Success message on password change
- [x] Error message on wrong current password
- [x] Modal closes on success

### Appearance Modal
- [x] Opens when tapping Appearance option
- [x] Shows Light Mode as active
- [x] Shows Coming Soon for Dark Mode
- [x] Shows Coming Soon for System Default
- [x] Modal closes properly

### About Modal
- [x] Opens when tapping About option
- [x] Shows app logo
- [x] Shows correct version
- [x] Shows SDK version
- [x] Shows correct platform (iOS/Android)
- [x] Website link opens browser
- [x] Modal closes properly

### Audit History Filter
- [x] In Progress filter appears
- [x] Filter correctly shows in_progress audits
- [x] In Progress has distinct styling (blue)
- [x] Other filters still work correctly

### Logout Button
- [x] Button visible in header top-right
- [x] Button has proper styling
- [x] Confirmation dialog appears
- [x] Logout works correctly
- [x] Old logout section removed

### Navigation Reset
- [x] After logout, user on login screen
- [x] After login, Dashboard opens
- [x] Not Profile screen after login
- [x] Works on both iOS and Android

## Version Information

| Component | Previous | Current |
|-----------|----------|---------|
| Mobile App | 1.12.0 | 1.13.0 |
| Backend | 1.7.1 | 1.7.2 |
| Web App | 1.8.0 | 1.8.1 |

## Mobile App Build Information

### Android (APK/AAB)
- **App Version:** 2.1.1
- **Version Code:** 10 (Latest Production Build)
- **Package Name:** com.auditpro.app
- **Build Type:** Production (APK)
- **SDK Version:** 54.0.0
- **Latest APK:** https://expo.dev/artifacts/eas/2n65NXjCxFwhPMR8QGLBSt.apk
- **Build ID:** 0b0ae3ea-398c-4eb6-9573-64384a7e0ffb
- **Build Date:** December 10, 2025

### iOS
- **App Version:** 2.1.1
- **Build Number:** 6 (Latest)
- **Bundle Identifier:** com.auditpro.app
- **Build Type:** Production (App Store) / Preview (Ad-hoc)
- **SDK Version:** 54.0.0
- **Supports Tablet:** Yes

### Recent Updates (December 10, 2025)
- ✅ **Photo Capture Optimization**: Reduced quality to 0.3, timeout to 15s, retries to 3
- ✅ **Photo Display Fix**: Fixed photo URL handling for proper display after save
- ✅ **Performance Optimizations**: Added useCallback and useMemo for faster rendering
- ✅ **Optimistic Updates**: Photos show immediately while uploading
- ✅ **OTA Update Published**: Production branch updated with latest changes

## Migration Notes

### For Developers
- Backend requires restart for new password change endpoint
- No database migrations required
- Mobile app requires `npm install` if dependencies changed

### For Users
- No action required
- All features work immediately after app update
- Existing passwords remain valid

## Screenshots

### Profile Screen (Updated)
- Logout button in top-right of header
- Security, Appearance, About now functional

### Security Modal
- Password change form with visibility toggles

### About Modal
- App information with version details

### Audit History Filter
- New "In Progress" filter option

---

**Documentation Updated:** December 3, 2025  
**Last Reviewed:** December 3, 2025

