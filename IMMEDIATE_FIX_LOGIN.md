# Immediate Fix for Login Rate Limit Issue

## Problem
User is getting "Too many login attempts" (429 error) and cannot login.

## Quick Fix Options

### Option 1: Restart Backend Server (Recommended)
**This will clear all rate limits immediately**

1. Stop the backend server (if running)
   - Press `Ctrl+C` in the terminal where backend is running
   
2. Restart the backend server
   ```bash
   cd backend
   npm start
   ```

3. Try logging in again
   - Email: `support@test.com`
   - Password: `admin123`

### Option 2: Wait 15 Minutes
- Rate limits reset after 15 minutes
- Then try logging in again

### Option 3: Use Different Network/IP
- If possible, connect from a different network
- This will have a fresh rate limit counter

## Changes Made

### 1. Increased Rate Limit
- **Before:** 20 attempts per 15 minutes
- **After:** 100 attempts per 15 minutes
- **File:** `backend/server.js`

### 2. Password Reset
- ✅ Password for `support@test.com` has been reset to `admin123`
- User exists and is ready to login

### 3. Better Error Messages
- More descriptive error messages
- Better logging for debugging

## Current Status

✅ **Password:** Reset to `admin123`
✅ **User:** Exists in database (ID: 3, Role: newauditor)
✅ **Rate Limit:** Increased to 100 attempts per 15 minutes
⏳ **Action Required:** Restart backend server to clear current rate limit

## After Restarting Backend

1. The rate limit will be reset (all counters cleared)
2. You'll have 100 fresh login attempts
3. Login should work immediately

## Testing

After restarting backend:
1. Open mobile app
2. Enter credentials:
   - Email: `support@test.com`
   - Password: `admin123`
3. Tap "Sign In"
4. Should login successfully ✅

## If Still Having Issues

1. **Check backend logs** for detailed error messages
2. **Verify backend is running** and accessible
3. **Check network connection** between mobile app and backend
4. **Verify API URL** in mobile app config matches backend URL

## Summary

- ✅ Password reset complete
- ✅ Rate limit increased
- ✅ Error messages improved
- ⏳ **RESTART BACKEND SERVER** to apply changes and clear rate limits

