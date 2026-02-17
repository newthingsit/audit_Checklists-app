# Template Selection Error Fix - Test Guide

## Problem
When clicking "New" and selecting a template on the mobile app, an error message "something went wrong" is displayed (from ErrorBoundary).

## Root Causes Identified & Fixed

### 1. Missing Parameter Validation in AuditFormScreen.js
**Issue**: No validation that route params contain a valid templateId
**Fix**: Added early parameter validation with logging

### 2. Inadequate Error Handling in fetchTemplate()
**Issue**: No specific error messages, only generic alerts
**Fix**: 
- Added validation for templateId before API call
- Enhanced error messages with specific scenarios
- Added error state tracking and rendering

### 3. No Feedback in CategorySelectionScreen.js
**Issue**: handleTemplateSelect() could fail silently if template was invalid
**Fix**:
- Added try-catch block
- Added template validation (must have .id)
- Added detailed logging

## Changes Made

### File: `mobile/src/screens/CategorySelectionScreen.js`
- Added parameter validation and error handling in `handleTemplateSelect()`
- Validates template object has required fields
- Provides user-friendly error messages

### File: `mobile/src/screens/AuditFormScreen.js`
- Added early parameter validation with console logging
- Added `error` state variable for tracking errors
- Enhanced `fetchTemplate()` with:
  - templateId validation
  - Detailed logging for debugging
  - Specific error messages for different failure scenarios
  - Response structure validation
- Added error rendering in component (check for error before other conditions)
- Better stack trace for debugging

## Testing Steps

### Manual Test on Device/Emulator:
1. Open the app and navigate to Dashboard
2. Click "New Audit" button
3. Select any category from the category list
4. Select any template from the template list
5. **Expected**: App should navigate to AuditFormScreen and load template successfully
6. **If Error**: Check console logs (Expo Go) for specific error message

### Console Logs to Monitor:
- `[CategorySelectionScreen] Selecting template:` - Template being selected
- `[AuditForm] Route params validated:` - Parameters being processed
- `[AuditForm] Fetching template:` - Template API call
- `[AuditForm] Template loaded:` - Successful load
- `[AuditForm] Error fetching template:` - Any failures

### If Error Still Occurs:
1. Check the console error message for specific issue
2. Look for `[AuditForm]` or `[CategorySelectionScreen]` prefixes in logs
3. Verify:
   - API is running on correct port
   - Template ID is valid integer
   - Network connection is stable
   - No CORS errors in backend

## Debugging Tips

### Enable Verbose Logging:
The code now logs:
- template ID values at each stage
- Response structure validation
- Specific error details including HTTP status

### Check Expo Go Console:
When running on device with Expo Go, check the console for:
- Exact error messages with context
- API URL being called
- Template data structure validation failures

## Validation Checklist
- [ ] CategorySelectionScreen handles template selection errors gracefully
- [ ] AuditFormScreen validates route parameters
- [ ] Error state renders when template fetch fails
- [ ] Retry button works when error occurs
- [ ] Console logs show clear error messages
- [ ] Template successfully loads when API responds correctly
