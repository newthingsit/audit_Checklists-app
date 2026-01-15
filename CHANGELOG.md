# Changelog

All notable changes to this project will be documented in this file.

## [1.14.0] - 2025-01-27

### Added
- **Conditional Logic**: Items can now show/hide based on previous answers
  - Database schema: `conditional_item_id`, `conditional_value`, `conditional_operator` columns
  - Template editor UI for configuring conditional display rules
  - Real-time evaluation in both web and mobile audit forms
  - Supports "equals", "not_equals", and "contains" operators
- **Photo Requirements Management**: 
  - Photo button only appears when `input_type === 'image_upload'`
  - Enhanced validation with clear error messages
  - Visual indicators (red borders, warning banners) for missing required photos
- **Detailed Progress Indicators**:
  - Shows "X required items incomplete"
  - Shows "X items need photos"
  - Category-level and overall progress breakdowns
- **Template Cloning**: 
  - "Duplicate Template" button with one-click duplication
  - Pre-filled editor with all items copied
- **Feature Comparison Document**: Industry research and best practices analysis

### Changed
- Photo button display logic to only show when required
- Progress indicators to show detailed breakdowns
- Error messages to be more specific about missing requirements

### Fixed
- Photo button showing for all items regardless of requirement
- Duplicate variable declaration in mobile app
- Progress calculation accuracy

### Technical
- Added conditional logic evaluation functions to web and mobile apps
- Updated database migrations for all supported database types
- Enhanced template editor with conditional logic UI
- Improved validation messages and visual feedback

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.14.0] - 2025-01-XX - Audit Scheduling & Role Management Enhancements

### Added - Backend
- **Individual Checklist Rescheduling**: Each checklist can now be rescheduled up to 2 times individually (not per-user-per-month)
- **Backdated Rescheduling**: Ability to reschedule audits to both past and future dates
- **Same-Day Validation**: Scheduled audits can only be opened on their scheduled date
- **Schedule Adherence Metric**: New dashboard metric showing percentage of audits completed on time
- **Checklist Assignment User-Wise**: Enhanced checklist assignment functionality for user-specific permissions
- **Rate Limit Improvements**: Increased login rate limit from 20 to 100 attempts (production) to prevent mobile app login issues
- **Role Management Updates**: Added `assign_checklists` permission to role management system

### Added - Web App
- **Schedule Adherence Card**: New dashboard card displaying schedule adherence percentage and statistics
- **Same-Day Validation UI**: User-friendly error messages when trying to open scheduled audits on wrong date
- **Enhanced Reschedule UI**: Updated reschedule interface to support backdated dates

### Added - Mobile App
- **Schedule Adherence Card**: New dashboard card displaying schedule adherence percentage and statistics with permission-based visibility
- **Same-Day Validation**: Added validation to prevent starting scheduled audits before/after scheduled date with user-friendly error messages
- **Per-Checklist Reschedule Tracking**: Mobile app now checks reschedule count per checklist (not per user)
- **Backdated Reschedule Support**: Date picker now allows selection of past dates
- **Improved Error Messages**: Better error handling and user-friendly messages for login and API errors
- **Rate Limit Handling**: Mobile app no longer retries on 400/429 errors to prevent unnecessary requests

### Changed - Backend
- **Reschedule Tracking**: Changed from per-user-per-month to per-checklist tracking in `reschedule_tracking` table
- **Reschedule Count Endpoint**: Updated `/api/scheduled-audits/reschedule-count` to accept `scheduled_audit_id` parameter
- **Audit Creation Validation**: Added validation to prevent opening scheduled audits before/after scheduled date
- **Analytics Endpoint**: Added schedule adherence calculation to dashboard analytics
- **Login Rate Limits**: Increased from 20 to 100 attempts per 15 minutes in production
- **Error Messages**: Improved error messages for invalid credentials and validation failures

### Changed - Mobile App
- **Dashboard Analytics**: Added analytics API call to fetch schedule adherence data
- **Reschedule Logic**: Updated to fetch and check reschedule count per scheduled audit ID
- **Date Picker**: Removed restriction on past dates for rescheduling
- **API Service**: Enhanced error handling to prevent retries on client errors (400, 429)
- **Login Screen**: Improved error messages for better user feedback

### Fixed - Backend
- **Rate Limit Issues**: Fixed mobile app login failures due to rate limiting
- **Reschedule Logic**: Fixed issue where rescheduling one checklist affected all checklists
- **Date Validation**: Fixed scheduled audit opening to enforce same-day rule
- **Permission Checks**: Updated role management to include checklist assignment permissions

### Fixed - Web App
- **Schedule Adherence Permission**: Fixed Schedule Adherence card to check `view_schedule_adherence` permission instead of `manage_scheduled_audits`

### Fixed - Mobile App
- **Schedule Adherence Permission**: Fixed Schedule Adherence card to check `view_schedule_adherence` permission instead of `manage_scheduled_audits`
- **Same-Day Validation**: Added frontend validation to prevent starting scheduled audits on wrong dates
- **Login Errors**: Fixed 400/429 errors during login by improving rate limit handling
- **Reschedule Count**: Fixed incorrect reschedule count display (was showing per-user, now per-checklist)
- **Error Messages**: Fixed unclear error messages during login failures

### Technical Details
- **Database**: No schema changes required (uses existing `reschedule_tracking` and `user_checklist_permissions` tables)
- **Backward Compatible**: All changes are backward compatible with existing data
- **API Changes**: 
  - `/api/scheduled-audits/reschedule-count` now accepts `scheduled_audit_id` query parameter
  - `/api/analytics/dashboard` now includes `scheduleAdherence` object in response
  - `/api/roles/permissions/list` now includes `assign_checklists` permission

### Components Version
- **Backend:** 1.8.0
- **Web App:** 1.9.0
- **Mobile App:** 1.14.0

---

## [1.13.0] - 2025-12-03 - Mobile App Profile & Navigation Enhancements

### Added - Mobile App
- **Security Modal**: Password change functionality with current password verification, new password validation (min 6 chars), and confirmation matching
- **Appearance Modal**: Theme selection UI showing Light Mode (active), Dark Mode (coming soon), System Default (coming soon)
- **About Modal**: App information display with version, SDK version, platform detection, and website link
- **In Progress Filter**: New filter option in Audit History for "In Progress" status
- **Logout in Header**: Logout button relocated to top-right corner of profile header

### Added - Backend
- **Password Change API**: `PUT /api/auth/change-password` endpoint with bcrypt password hashing and validation

### Changed - Mobile App
- **Navigation Reset**: App now opens to Dashboard after login instead of staying on Profile
- **Initial Route**: Tab Navigator now explicitly sets Dashboard as initial route
- **Filter Styling**: In Progress status has distinct blue/info styling (separate from Pending's yellow)

### Fixed - Mobile App
- **Security Not Working**: Security option now opens functional password change modal
- **Appearance Not Working**: Appearance option now opens theme selection modal
- **About Not Working**: About option now displays app information
- **Missing In Progress Filter**: Audit History filter now includes "In Progress" option
- **Navigation After Login**: Fixed issue where app opened to Profile instead of Dashboard after logout/login cycle

---

## [1.12.0] - 2025-12-01 - Role & Permission Sync Fix

### Fixed - Mobile App
- **Role & Permission Synchronization**: Fixed issue where role/permission changes made in web app weren't reflecting in mobile app
  - Added automatic user data refresh when app comes to foreground
  - Added screen focus refresh for Dashboard and Profile screens
  - Enhanced pull-to-refresh to refresh user data before fetching dashboard data
  - Permissions now recalculated on each fetch to ensure latest values
  
- **Notification Service Error**: Fixed `removeNotificationSubscription is not a function` error
  - Updated to use subscription `.remove()` method (Expo Notifications API change)
  - Proper cleanup of notification listeners

- **Package Compatibility**: Updated packages to match Expo SDK 54 requirements
  - `expo-device`: 7.0.3 → 8.0.9
  - `expo-notifications`: 0.31.2 → 0.32.13
  - `expo-local-authentication`: 15.0.2 → 17.0.7
  - `expo-location`: 18.0.10 → 19.0.7
  - `react-native-svg`: 15.11.2 → 15.12.1

### Fixed - Backend
- **Settings API 404 Error**: Fixed `/api/settings/preferences` returning 404
  - Reordered routes so specific paths come before wildcard routes
  - Fixed route priority for `/preferences` and `/features/all` endpoints

### Changed - Mobile App
- **AuthContext**: Added `refreshUser()` function for manual user data refresh
- **Dashboard Screen**: Converted `fetchData` to `useCallback` with permission recalculation
- **Profile Screen**: Added pull-to-refresh and screen focus refresh

## [1.8.0] - 2025-11-26 - Dashboard Enhancements & Store Groups

### Added - Web App
- **🏆 Leaderboard Widget**: New dashboard section showing top stores and auditors
  - Tab switching between Top Stores and Top Auditors
  - Medal display (🥇🥈🥉) for top 3 performers
  - Shows audit counts and average scores
  - Beautiful gradient card design
  
- **📊 Trend Analysis Widget**: Period-based performance comparison
  - Compare current vs previous period stats
  - Selectable periods: Daily, Weekly, Monthly, Quarterly
  - Displays total audits, completed, and avg score changes
  - Visual change indicators with up/down arrows
  
- **🗂️ Store Groups Management**: New page to organize stores
  - Create groups by Region, District, Brand, Franchise, or Custom
  - Hierarchical tree view with expandable sections
  - Assign stores to groups with multi-select dialog
  - Group analytics (total audits, completed, avg score)
  - Summary cards showing group/store counts
  - Full CRUD operations for groups
  
- **📧 Email Reports**: Send audit reports via email
  - Email button on Audit Detail page
  - Send to custom email address
  - Quick send to store manager option
  - Professional email template with audit details

### Added - Backend
- **Leaderboard API**: 
  - `GET /api/analytics/leaderboard/stores` - Top performing stores
  - `GET /api/analytics/leaderboard/auditors` - Top auditors by audit count
  
- **Trend Analysis API**:
  - `GET /api/analytics/trends/analysis` - Period comparison stats
  - `GET /api/analytics/trends/weekly` - Weekly trend data
  
- **Store Groups API**:
  - `GET /api/store-groups` - List all groups
  - `GET /api/store-groups/tree` - Hierarchical tree structure
  - `POST /api/store-groups` - Create new group
  - `PUT /api/store-groups/:id` - Update group
  - `DELETE /api/store-groups/:id` - Delete group
  - `POST /api/store-groups/:id/stores` - Assign stores to group
  - `GET /api/store-groups/:id/analytics` - Group-level analytics
  
- **Email Reports API**:
  - `POST /api/reports/audit/:id/email` - Send audit report to email
  - `POST /api/reports/audit/:id/email-store` - Send to store manager
  - Professional HTML email template with audit details

### Database Changes
- New `store_groups` table for group management
- Added `group_id` column to `locations` table
- Added `brand` column to `locations` table
- Created indexes for performance optimization

### Navigation
- Store Groups added to sidebar under Stores section
- All new features integrated with existing permission system

---

## [1.11.0] - 2025-11-26 - Location Verification Report & GPS Fixes

### Added - Web App
- **Location Verification Report**: New report page comparing store location vs GPS location
- GPS verification status: Verified (≤100m), Nearby (≤500m), Far (≤1km), Suspicious (>1km)
- User-wise breakdown with expandable accordion view
- Summary cards showing verification statistics
- Distance calculation using Haversine formula
- Filter by date range, user, and store
- Export to CSV functionality
- "View on Google Maps" button for GPS locations
- Verification rate and average distance per user
- Color-coded status chips for easy identification
- Navigation link in sidebar under Analytics

### Added - Backend
- **Location Verification API**: `GET /api/reports/location-verification`
- **CSV Export**: `GET /api/reports/location-verification/csv`
- Distance calculation between store coordinates and audit GPS
- User grouping with statistics (total, verified, suspicious, avg distance)
- Support for date range and location filters

### Fixed - Mobile App
- **Platform Import Error**: Added missing `Platform` import in `LocationCapture.js`
- **GPS Location Not Saving on Update**: Fixed audit update to include GPS location data
- GPS coordinates now saved when updating existing audits
- GPS coordinates saved when resuming scheduled audits

### Fixed - Backend
- **Audit Update API**: Extended PUT `/api/audits/:id` to accept GPS location fields
- Now supports: `gps_latitude`, `gps_longitude`, `gps_accuracy`, `gps_timestamp`, `location_verified`

### Already Supported (Verified)
- Stores CSV Import: Latitude/Longitude columns fully supported
- Stores CSV Export: Includes all GPS coordinates
- Sample CSV template includes GPS coordinate examples
- Backend import endpoint handles GPS coordinates

---

## [1.10.0] - 2025-11-25 - Biometric Authentication

### Added - Mobile App
- **Biometric Authentication**: Face ID / Touch ID / Fingerprint login
- **BiometricService**: Core service using Expo LocalAuthentication
- **BiometricContext**: React context for app-wide biometric state
- **Admin Feature Control**: Admins can enable/disable biometric auth
- **Quick Unlock**: Biometric login on app launch for faster access
- **Profile Toggle**: Enable/disable biometric in user settings

### Added - Backend
- **Feature Flags API**: New `/api/settings/features` endpoints
- **app_settings table**: Store admin-controlled feature toggles
- **Admin Toggle**: POST `/api/settings/features/:feature/toggle`

### Features
- Face ID (iOS) and Fingerprint (Android) support
- Automatic biometric prompt on login screen
- Fallback to password if biometric fails
- Secure credential storage with expo-secure-store
- Admin can disable feature organization-wide
- User can toggle on/off in Profile settings

### Dependencies Added
- `expo-local-authentication`: ~15.0.2

---

## [1.9.0] - 2025-11-25 - GPS Location Tagging

### Added - Mobile App
- **GPS Location Service**: Complete location service using Expo Location
- **Location Context**: React context for app-wide location state management
- **Location Capture Button**: One-tap GPS coordinate capture with display
- **Location Display Card**: Rich display with address lookup and map link
- **Location Verification**: Verify auditor is at expected location
- **Permission Request UI**: User-friendly location permission handling
- **Distance Calculation**: Haversine formula for accurate distance
- **Geocoding**: Convert coordinates to addresses and vice versa
- **Map Integration**: Open location in Google Maps or Apple Maps
- **Location History**: Track location captures for audit trail
- **Location Settings**: Configurable accuracy and verification distance

### Features
- Capture GPS coordinates when starting/completing audits
- Verify auditor is within specified distance of store location
- Display coordinates in decimal or DMS format
- Reverse geocoding to show human-readable addresses
- Open captured locations in native maps app
- High/balanced accuracy toggle for battery optimization
- Configurable maximum distance for location verification (default 500m)

### Technical Details
- `LocationService.js`: Core location functionality
- `LocationContext.js`: React context provider
- `LocationCapture.js`: UI components for location features
- Haversine formula for Earth-surface distance calculation
- AsyncStorage for location history and settings

---

## [1.8.0] - 2025-11-25 - Push Notifications & Digital Signatures

### Added - Mobile App
- **Push Notification Service**: Complete notification system using Expo Notifications
- **Notification Preferences**: User-configurable notification settings
- **Scheduled Audit Reminders**: Automatic reminders before scheduled audits
- **Overdue Action Alerts**: Notifications for overdue action items
- **Audit Completion Notices**: Confirmation notifications when audits complete
- **Quiet Hours**: Configurable do-not-disturb time periods
- **Digital Signature Capture**: SVG-based signature pad component
- **Signature Modal**: Full-screen signature capture with save/clear
- **Signature Display**: Component for viewing saved signatures
- **Signature Button**: Quick-access button showing signature status
- **Notification Settings Screen**: Full settings UI for notification preferences

### Technical Details
- `NotificationService.js`: Expo push notifications with channels
- `NotificationContext.js`: React context for notification state
- `SignatureCapture.js`: SVG-based signature components
- `NotificationSettingsScreen.js`: Full notification preferences UI
- Android notification channels for reminders and alerts
- Signature data stored as SVG paths with timestamps

---

## [1.7.0] - 2025-11-25 - Mobile Offline Support

### Added - Mobile App
- **Network Connectivity Monitoring**: Real-time detection of online/offline status
- **Offline Storage Service**: Cache templates, locations, and audits locally using AsyncStorage
- **Sync Queue Manager**: Queue offline operations and auto-sync when connection returns
- **Pending Audit Storage**: Create and save audits while offline
- **Photo Upload Queue**: Queue photos for upload when back online
- **Offline Indicators**: Visual feedback for connection status throughout the app
- **Sync Status Badge**: Shows pending sync count with tap-to-sync functionality
- **Auto-Sync**: Automatically syncs pending data when connection is restored
- **Prefetch for Offline**: Downloads templates and locations for offline use
- **Connection Status Dot**: Small indicator showing connection quality

### Changed - Mobile App
- Dashboard header now shows connection status and sync badge
- Checklists screen uses cached templates when offline
- Added offline mode card showing last sync time
- Enhanced error handling for network failures

### Technical Details
- `NetworkContext.js`: Monitors connectivity using @react-native-community/netinfo
- `OfflineStorage.js`: AsyncStorage-based caching with TTL support
- `SyncManager.js`: Handles sync queue processing with retry logic
- `OfflineContext.js`: Combines network state, storage, and sync management
- `OfflineIndicator.js`: UI components for offline status display

---

## [1.6.0] - 2025-11-25 - UI/UX Refresh

### Added - Web App
- Modern theme system with teal/coral color palette
- Global animations CSS with comprehensive keyframe animations
- Password visibility toggle on login/register forms
- Frosted glass effect app bar with backdrop blur
- Staggered reveal animations for dashboard elements
- Custom scrollbar styling across the application
- Status badge styling improvements
- Loading skeleton components with shimmer effects
- Empty state components for better UX
- Error state components with retry actions
- Dark mode toggle with system preference detection

### Added - Mobile App
- Redesigned theme config matching web app aesthetic
- Loading skeleton components for all screens
- Empty state components (NoAudits, NoTemplates, NoTasks, etc.)
- Error state components (NetworkError, ServerError, etc.)
- Linear gradients for UI elements using expo-linear-gradient

### Changed - Web App
- Complete visual refresh of Login page with dark theme and floating shapes
- Register page redesigned to match new login aesthetic
- Sidebar redesigned with dark navy background and teal accents
- Dashboard stat cards now use gradient backgrounds
- Layout component enhanced with better navigation styling
- Typography improvements across the application
- Button hover effects with lift and shadow animations
- Audit History page polished with new components

### Changed - Mobile App
- Login screen completely redesigned with gradient background and floating shapes
- Register screen matches new login design with orange accent
- Dashboard with new stat cards, better cards, and "View All" button
- Profile screen with gradient header and modern settings layout
- Audit History screen with skeleton loading and improved filters
- Tab bar navigation with active indicator dots
- Stack headers with consistent styling

### Improved
- Navigation menu items animate in with staggered delays
- Active page indicator more visible with border accent
- User profile section at sidebar bottom redesigned
- Focus states consistent across all interactive elements
- Selection highlighting uses brand colors
- Mobile app now has consistent design language with web app

---

## [1.5.0] - 2025-11-25 - Security Hardening & Performance Optimization

### Added
- Secure logging system with data sanitization (passwords, tokens, emails redacted in production)
- 40+ database indexes for improved query performance
- 3-tier rate limiting (auth, sensitive ops, uploads, general API)
- CORS security logging and preflight caching
- Analytics API caching (2 min cache)

### Changed
- Web token storage: localStorage → memory + sessionStorage (XSS protection)
- Mobile token storage: Consistently uses expo-secure-store
- All route files use centralized logger utility
- Theme storage uses sessionStorage for consistency

### Fixed
- Mobile AsyncStorage leak in AuthContext
- Remaining console.log statements in production code

### Security
- Rate limiting for sensitive operations (users/roles): 10 req/hour
- Rate limiting for file uploads: 20 req/15 min
- Permission details only exposed in development mode
- CORS blocked origins logged for security monitoring

---

## [1.4.0] - 2025-11-24 - Store Analytics & Enhanced Reporting

### Added
- Store Analytics page with card/list views
- CSV export for store analytics
- Date range filtering for analytics
- Enhanced audit CSV export with India time format

---

## [0.0.0] - Initial Release

### Added
- Complete mobile app with React Native and Expo
- Web dashboard with Material-UI
- Backend RESTful API with Express
- User authentication system
- Audit management system
- Checklist templates
- Photo upload functionality
- Advanced filtering and search
- Profile management
- Theme configuration system
- Multi-database support (SQLite, MySQL, PostgreSQL, MSSQL)

### Mobile App Features
- Enhanced dashboard with gradient stat cards
- Audit form with stepper navigation
- Photo uploads per checklist item
- Comments for audit items
- Advanced audit history with filters
- Profile screen with user settings
- Bottom tab navigation
- Consistent theming throughout

### Web App Features
- Material-UI dashboard
- Complete audit management
- Analytics and reporting
- User and role management
- Action plans and tasks
- Scheduled audits
- Export functionality

### Backend Features
- JWT authentication
- RESTful API endpoints
- File upload handling
- Scheduled tasks with node-cron
- Email notifications
- Multi-database support

### Fixed
- Icon display issues (migrated to Expo Vector Icons)
- Login connectivity issues (API IP configuration)
- Error handling improvements

### Changed
- Updated all package versions to 0.0.0
- Migrated from react-native-vector-icons to @expo/vector-icons
- Improved error messages and debugging

---

[0.0.0]: Initial stable release

