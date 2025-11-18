# Testing Guide - Photo Upload Feature

## Quick Test Steps

### 1. Verify Backend is Running
```bash
# Check if backend is running
# You should see: "Server running on port 5000"
```

### 2. Test Photo Upload Endpoint
Open browser and test:
```
http://192.168.1.156:5000/api/health
```
Should return: `{"status":"OK","message":"Server is running"}`

### 3. Test in Mobile App

1. **Login to the app**
   - Use your credentials
   - Verify login succeeds

2. **Navigate to Audit Form**
   - Go to Dashboard
   - Click "New Audit" or go to Checklists
   - Select a template
   - Fill in restaurant information
   - Click "Next: Checklist"

3. **Upload a Photo**
   - Scroll to any checklist item
   - Click "Add Photo" button
   - Grant camera roll permissions if prompted
   - Select an image from your gallery
   - Wait for upload to complete
   - Verify:
     - ✅ Success message appears
     - ✅ Photo displays in the form
     - ✅ Photo can be removed with X button

4. **Save Audit**
   - Complete the audit form
   - Click "Save Audit"
   - Verify audit saves successfully

5. **View Uploaded Photo**
   - Go to Audit History
   - Open the saved audit
   - Verify photo displays correctly

## Expected Behavior

### ✅ Success Indicators
- No 404 errors in console
- No deprecation warnings
- Photo uploads successfully
- Photo displays in form
- Photo URL is correct format: `http://192.168.1.156:5000/uploads/audit-*.jpg`
- Photo persists when audit is saved

### ❌ Common Issues

**Issue:** Still getting 404
- **Check:** Backend server restarted?
- **Check:** Endpoint is `/api/photo` not `/api/upload`
- **Check:** Backend terminal shows route registered

**Issue:** Photo not displaying
- **Check:** Photo URL in console logs
- **Check:** Static file serving enabled
- **Check:** File exists in `backend/uploads/` folder
- **Check:** CORS allows image requests

**Issue:** Authentication error
- **Check:** User is logged in
- **Check:** Token is valid
- **Check:** Authorization header is sent

## Debug Information

### Check Console Logs
In Expo terminal, you should see:
```
Photo uploaded successfully: http://192.168.1.156:5000/uploads/audit-...
```

### Check Backend Logs
In backend terminal, you should see:
```
POST /api/photo 200
```

### Verify File Upload
Check if file exists:
```bash
cd backend
dir uploads
```

## Next Steps After Testing

If everything works:
- ✅ Photo upload feature is complete
- ✅ Ready for production use

If issues persist:
- Check error messages in console
- Verify network connectivity
- Check backend logs
- Review PHOTO_UPLOAD_FIX.md for details

---

**Last Updated:** After photo upload fixes
**Status:** Ready for testing

