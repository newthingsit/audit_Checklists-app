# Project Version Information

## Version 1.1.0 - User Management & Bug Fixes

**Date:** 2024-12-20

### What's New in This Version

#### User Management Enhancements
- ✅ **Bulk CSV Import for Users**: Added ability to import multiple users from CSV file
- ✅ **CSV Import Dialog**: Full-featured import dialog with file upload, preview, and validation
- ✅ **Sample CSV Download**: Download sample CSV template for user import
- ✅ **Default Password Generation**: Automatically assigns default password if not provided in CSV
- ✅ **Import Results**: Detailed success/failure reporting with error messages

#### Bug Fixes
- ✅ **Fixed History Access Issue**: Resolved issue where support@test.com user was stuck on history page
- ✅ **Fixed Scheduled Audit Continuation**: Fixed issue where users couldn't continue partially completed scheduled audits
- ✅ **Fixed Bulk Delete Permissions**: Admins can now bulk delete any audits, not just their own
- ✅ **Fixed Actions API 500 Error**: Resolved database compatibility issue with lastID handling across SQLite, MySQL, PostgreSQL, and SQL Server
- ✅ **Fixed ESLint Warnings**: Removed all unused imports and variables, fixed React Hook dependencies

#### Mobile App Improvements
- ✅ **Better Error Handling**: Improved error handling in AuditHistoryScreen to prevent getting stuck
- ✅ **Scheduled Audit Continuation**: Fixed logic to check for existing audits before creating new ones
- ✅ **Audit Form Enhancement**: Automatically detects and loads existing audits when continuing scheduled audits

#### Backend Improvements
- ✅ **Cross-Database Compatibility**: Fixed lastID handling for all database types (SQLite, MySQL, PostgreSQL, SQL Server)
- ✅ **Admin Permissions**: Enhanced bulk delete endpoints to properly handle admin permissions
- ✅ **User Import API**: New `/api/users/import` endpoint for bulk user creation with validation

### Components Version
- **Backend:** 1.1.0
- **Web App:** 1.1.0
- **Mobile App:** 1.1.0

---

## Version 1.0.0 - Enhanced CSV Import & Template Management

**Date:** 2024-12-19

### What's New in This Version

#### CSV Import Enhancements
- ✅ **Improved CSV Parser**: Now handles quoted fields and commas within values correctly
- ✅ **Real-time Preview Table**: See parsed data before importing with full item details
- ✅ **Auto-generated Default Options**: If no options column provided, automatically adds Yes:3, No:0, N/A:NA
- ✅ **Simplified CSV Format**: Only `title` column is required, all others are optional
- ✅ **Better Error Handling**: Clear error messages with real-time validation
- ✅ **Options Column Support**: CSV now includes `options` column showing Label:Score format (e.g., "Yes:3;No:0;NA:NA")

#### Template Management Improvements
- ✅ **Removed Category Field**: Category field removed from template-level creation
- ✅ **Removed Warning Option**: "Warning" label removed from default scoring options
- ✅ **Flexible CSV Format**: Support for minimal CSV (just title) or full format with all columns

#### Mobile App Enhancements
- ✅ **Scheduled Audits Screen**: Full support for viewing and starting scheduled audits
- ✅ **Start/Continue Audit**: Ability to start pending audits and continue in-progress audits
- ✅ **Status Normalization**: Consistent status handling across web and mobile

#### Backend Improvements
- ✅ **Enhanced CSV Import API**: Better parsing with quoted field support
- ✅ **Default Options Generation**: Automatic default options when not provided
- ✅ **Improved Error Messages**: More detailed error responses for debugging

### Components Version
- **Backend:** 1.0.0
- **Web App:** 1.0.0
- **Mobile App:** 1.0.0

---

## Version 0.0.0 - Initial Release

**Date:** $(Get-Date -Format "yyyy-MM-dd")

### Project Overview
Restaurant Audit & Checklist Management System

### Components Version
- **Backend:** 0.0.0
- **Web App:** 0.0.0
- **Mobile App:** 0.0.0

### Key Features Implemented

#### Mobile App
- ✅ Enhanced Dashboard with gradient stat cards
- ✅ Audit Form with photo uploads and comments
- ✅ Advanced Audit History with filters
- ✅ Profile management screen
- ✅ Bottom tab navigation
- ✅ Theme configuration system
- ✅ Expo Vector Icons integration
- ✅ Login/Register functionality

#### Web App
- ✅ Material-UI dashboard
- ✅ Complete audit management
- ✅ Analytics and reporting
- ✅ User and role management
- ✅ Action plans and tasks
- ✅ Scheduled audits

#### Backend
- ✅ RESTful API
- ✅ JWT Authentication
- ✅ Multi-database support (SQLite, MySQL, PostgreSQL, MSSQL)
- ✅ File upload handling
- ✅ Scheduled tasks
- ✅ Email notifications

### Technical Stack

**Mobile:**
- React Native with Expo SDK 54.0.0
- React Navigation
- Expo Vector Icons
- Axios for API calls
- AsyncStorage for local storage

**Web:**
- React 18.2.0
- Material-UI 5.14.5
- React Router 6.16.0
- Axios for API calls

**Backend:**
- Node.js with Express
- JWT Authentication
- Multi-database support
- Multer for file uploads
- Node-cron for scheduled tasks

### API Configuration
- Default API URL: `http://192.168.1.156:5000/api`
- Port: 5000

### Known Issues
- None at this time

### Next Steps
- Continue development from this stable baseline

---

**Note:** This version represents the initial stable release with all core features implemented and tested.

