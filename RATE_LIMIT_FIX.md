# Rate Limit Fix for Mobile App

## Issue
Mobile app was getting 429 (Too Many Requests) errors during login attempts due to strict rate limiting.

## Changes Made

### 1. Increased Login Rate Limit
**File:** `backend/server.js`
- Changed production rate limit from **5 attempts** to **20 attempts** per 15 minutes
- This allows for mobile app retries and multiple devices

### 2. Prevent Retries on Auth Errors
**File:** `mobile/src/services/ApiService.js`
- Added explicit handling for 400 (Bad Request) errors - no retry
- Added explicit handling for 429 (Rate Limited) errors - no retry
- Prevents infinite retry loops on authentication failures

### 3. Better Error Messages
**File:** `mobile/src/screens/LoginScreen.js`
- Added specific error message for 429 rate limit errors
- Improved error handling for 400 bad request errors
- Better user feedback

## Testing

After these changes:
1. Restart backend server
2. Clear mobile app cache/storage
3. Try logging in
4. Should see better error messages instead of rate limit errors

## Rate Limit Details

- **Login attempts:** 20 per 15 minutes (per IP)
- **Other API calls:** 500 per 15 minutes (per IP)
- **File uploads:** 500 per 15 minutes (per IP)

These limits should be sufficient for normal mobile app usage.

