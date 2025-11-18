# Photo Upload Fix - Summary

## Issues Fixed

### 1. **404 Error on Photo Upload**
**Problem:** Mobile app was trying to upload to `/api/upload` but backend route is `/api/photo`

**Solution:** Changed upload endpoint from `${API_BASE_URL}/upload` to `${API_BASE_URL}/photo`

### 2. **Deprecation Warning**
**Problem:** `ImagePicker.MediaTypeOptions` is deprecated

**Solution:** Changed from `mediaTypes: ImagePicker.MediaTypeOptions.Images` to `mediaTypes: [ImagePicker.MediaTypeOptions.Images]` (array syntax)

### 3. **Static File Serving**
**Problem:** Uploaded photos couldn't be accessed because backend wasn't serving static files

**Solution:** Added static file serving in `backend/server.js`:
```javascript
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

### 4. **Photo URL Construction**
**Problem:** Backend returns relative URL `/uploads/filename.jpg` but mobile needs full URL

**Solution:** Construct full URL by combining base URL with photo path:
```javascript
const baseUrl = API_BASE_URL.replace('/api', '');
const fullPhotoUrl = `${baseUrl}${photoUrl}`;
```

### 5. **Error Handling**
**Problem:** Generic error messages didn't help debug issues

**Solution:** Added specific error messages for:
- 401: Authentication required
- 404: Endpoint not found
- Network errors: Connection issues

## Files Modified

### Mobile App
- `mobile/src/screens/AuditFormScreen.js`
  - Fixed upload endpoint
  - Fixed deprecation warning
  - Improved photo URL construction
  - Enhanced error handling
  - Added missing themeConfig import

### Backend
- `backend/server.js`
  - Added static file serving for uploads directory

## Testing Checklist

- [x] Backend server restarted with static file serving
- [ ] Test photo upload from mobile app
- [ ] Verify photo appears in audit form
- [ ] Verify photo is saved with audit
- [ ] Verify photo displays in audit detail view

## API Endpoints

### Upload Photo
- **Endpoint:** `POST /api/photo`
- **Authentication:** Required (Bearer token)
- **Content-Type:** `multipart/form-data`
- **Field Name:** `photo`
- **Response:**
  ```json
  {
    "photo_url": "/uploads/audit-1234567890-123456789.jpg",
    "filename": "audit-1234567890-123456789.jpg"
  }
  ```

### Access Uploaded Photo
- **URL:** `http://YOUR_IP:5000/uploads/filename.jpg`
- **Method:** GET
- **Authentication:** Not required (public access)

## Next Steps

1. **Restart Backend Server** (if not already done)
   ```bash
   cd backend
   npm start
   ```

2. **Reload Mobile App**
   - Shake device → Reload
   - Or press `r` in Expo terminal

3. **Test Photo Upload**
   - Go to Audit Form
   - Select a checklist item
   - Click "Add Photo"
   - Select image from gallery
   - Verify upload succeeds
   - Verify photo displays in form

## Troubleshooting

### Still Getting 404?
- Verify backend server is running
- Check backend terminal for route registration
- Verify endpoint is `/api/photo` (not `/api/upload`)

### Photo Not Displaying?
- Check photo URL in console logs
- Verify static file serving is enabled
- Check if file exists in `backend/uploads/` directory
- Verify CORS is enabled for image requests

### Authentication Errors?
- Verify user is logged in
- Check if token is being sent in Authorization header
- Try logging out and logging back in

---

**Status:** ✅ All fixes applied and ready for testing

