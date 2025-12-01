# Version 1.12.0 - Role & Permission Sync Fix

**Release Date:** December 1, 2025  
**Status:** ✅ Complete

## Overview

This version focuses on fixing critical issues with role and permission synchronization between the web and mobile applications. When administrators assign or modify user roles in the web application, these changes were not being reflected in the mobile app, causing permission-based features to fail.

## Problem Statement

### Issues Identified
1. **Role Changes Not Reflecting**: When a user's role was changed in the web app, the mobile app continued to show old permissions
2. **404 Error on Preferences API**: The `/api/settings/preferences` endpoint was returning 404 errors
3. **Notification Subscription Error**: Mobile app was crashing with `removeNotificationSubscription is not a function` error
4. **Stale Permission Checks**: Dashboard was using cached permission values instead of fetching fresh data

### Impact
- Users with updated roles couldn't access features they should have access to
- Mobile app users had to logout and login again to see permission changes
- Preferences API was completely broken
- Notification service was causing app crashes

## Solution

### 1. Mobile App Role & Permission Synchronization

#### AuthContext Enhancements
- **Added `refreshUser()` Function**: Public function to manually refresh user data from server
- **AppState Listener**: Automatically refreshes user data when app comes to foreground
- **Improved Error Handling**: Only clears authentication on 401/403 errors, not network errors

**Implementation:**
```javascript
// Refresh user data when app comes to foreground
useEffect(() => {
  const subscription = AppState.addEventListener('change', nextAppState => {
    if (appState.current.match(/inactive|background/) &&
        nextAppState === 'active' && token) {
      refreshUser();
    }
  });
  return () => subscription?.remove();
}, [token]);
```

#### Dashboard Screen Improvements
- **useFocusEffect**: Refreshes user data when dashboard screen is focused
- **Permission Recalculation**: Permissions recalculated inside `fetchData` to use latest values
- **Reactive Data Fetching**: Dashboard refetches data when user ID, role, or permissions change
- **Enhanced Pull-to-Refresh**: Refreshes user data first, then fetches dashboard data

**Key Changes:**
```javascript
// Recalculate permissions inside fetchData
const fetchData = useCallback(async () => {
  const currentPermissions = user?.permissions || [];
  const canViewTemplatesNow = hasPermission(currentPermissions, 'display_templates') || ...
  // Use latest permissions for API calls
}, [user]);
```

#### Profile Screen Updates
- **Pull-to-Refresh**: Added refresh control for manual user data refresh
- **Screen Focus Refresh**: Automatically refreshes when screen is focused
- **Post-Update Refresh**: Refreshes user data after profile updates

### 2. Backend API Route Fixes

#### Settings Route Ordering
**Problem**: Express routes were matched in order, so `/api/settings/preferences` was being caught by the `/:key` wildcard route.

**Solution**: Reordered routes so specific paths come before wildcard routes:
1. `/preferences` (GET/PUT) - User preferences
2. `/features/all` (GET) - Feature flags
3. `/features/:feature/toggle` (POST) - Toggle features
4. `/` (GET) - All app settings
5. `/:key` (GET/PUT) - Specific setting (wildcard - now last)

**Files Modified:**
- `backend/routes/settings.js`

### 3. Notification Service Fixes

#### Expo Notifications API Update
**Problem**: `Notifications.removeNotificationSubscription()` function doesn't exist in newer Expo SDK versions.

**Solution**: Use subscription object's `.remove()` method directly:
```javascript
// Before (broken)
Notifications.removeNotificationSubscription(this.notificationListener);

// After (fixed)
this.notificationListener.remove();
```

**Files Modified:**
- `mobile/src/services/NotificationService.js`

### 4. Package Updates

Updated packages to match Expo SDK 54 compatibility requirements:
- `expo-device`: 7.0.3 → 8.0.9
- `expo-notifications`: 0.31.2 → 0.32.13
- `expo-local-authentication`: 15.0.2 → 17.0.7
- `expo-location`: 18.0.10 → 19.0.7
- `react-native-svg`: 15.11.2 → 15.12.1

**Files Modified:**
- `mobile/package.json`

## Technical Details

### Files Modified

#### Mobile App
1. **`mobile/src/context/AuthContext.js`**
   - Added `refreshUser()` function
   - Added `AppState` listener for foreground refresh
   - Improved error handling

2. **`mobile/src/screens/DashboardScreen.js`**
   - Added `useFocusEffect` for screen focus refresh
   - Converted `fetchData` to `useCallback` with permission recalculation
   - Updated `useEffect` dependencies
   - Enhanced `onRefresh` to refresh user data first

3. **`mobile/src/screens/ProfileScreen.js`**
   - Added pull-to-refresh functionality
   - Added `useFocusEffect` for screen focus refresh
   - Added user data refresh after profile updates

4. **`mobile/src/services/NotificationService.js`**
   - Fixed subscription cleanup to use `.remove()` method

5. **`mobile/package.json`**
   - Updated package versions for Expo SDK 54 compatibility

#### Backend
1. **`backend/routes/settings.js`**
   - Reordered routes to fix 404 errors
   - Moved `/preferences` and `/features/*` routes before `/:key` route

## Testing

### Test Cases

1. **Role Change Synchronization**
   - ✅ Change user role in web app
   - ✅ Navigate to Dashboard in mobile app
   - ✅ Verify permissions are updated automatically
   - ✅ Verify dashboard shows correct content based on new permissions

2. **Screen Focus Refresh**
   - ✅ Change user role in web app
   - ✅ Switch to mobile app (bring to foreground)
   - ✅ Verify user data refreshes automatically
   - ✅ Navigate to Profile screen
   - ✅ Verify user data refreshes on screen focus

3. **Pull-to-Refresh**
   - ✅ Change user role in web app
   - ✅ Pull down on Dashboard screen
   - ✅ Verify user data refreshes first
   - ✅ Verify dashboard data updates with new permissions

4. **Preferences API**
   - ✅ Test `GET /api/settings/preferences` endpoint
   - ✅ Verify returns 200 OK (not 404)
   - ✅ Test `PUT /api/settings/preferences` endpoint
   - ✅ Verify updates work correctly

5. **Notification Service**
   - ✅ Test app startup
   - ✅ Verify no `removeNotificationSubscription` errors
   - ✅ Test notification cleanup on app close

## User Impact

### Before Fix
- Users had to logout and login again to see role/permission changes
- Dashboard showed incorrect content based on stale permissions
- Preferences API was completely broken
- App crashed on notification cleanup

### After Fix
- ✅ Role/permission changes reflect immediately
- ✅ Dashboard automatically updates when permissions change
- ✅ Preferences API works correctly
- ✅ No more notification errors
- ✅ Better user experience with automatic synchronization

## Migration Notes

### For Developers
- No database migrations required
- No breaking API changes
- Mobile app requires package update: `npm install`
- Backend requires restart to apply route changes

### For Users
- No action required
- Changes are automatic and transparent
- Mobile app will automatically sync when updated

## Version Information

- **Backend Version:** 1.5.1
- **Web App Version:** 1.6.0
- **Mobile App Version:** 1.12.0

## Related Issues

- Fixed: Role changes not reflecting on mobile app
- Fixed: 404 error on `/api/settings/preferences`
- Fixed: Notification subscription cleanup error
- Fixed: Stale permission checks in dashboard

## Next Steps

1. Monitor user feedback on permission synchronization
2. Consider adding permission change notifications
3. Add analytics to track permission refresh frequency
4. Consider adding manual refresh button in settings

---

**Documentation Updated:** December 1, 2025  
**Last Reviewed:** December 1, 2025

