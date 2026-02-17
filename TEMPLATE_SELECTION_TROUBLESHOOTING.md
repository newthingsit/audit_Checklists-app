# Template Selection & Audit Start - Troubleshooting Guide

## Diagnostic Logging Enabled

Recent code updates add comprehensive logging to help diagnose template selection issues. When testing, check the Expo Go console for these logs:

### What Should Happen (Successful Flow)

1. **User opens app and clicks "New"**
   ```
   [CategorySelectionScreen] Fetching templates from API
   ```

2. **User selects category**
   ```
   (No special log - just state update)
   ```

3. **User selects template from category**
   ```
   [CategorySelectionScreen] Selecting template: {
     id: <number>,
     name: "<template name>",
     hasItems: true
   }
   ```

4. **App navigates to AuditForm**
   ```
   [AuditForm] Route params received: {
     templateId: <number>,
     templateIdType: "number" or "string",
     auditId: undefined,
     auditIdType: "undefined",
     scheduledAuditId: undefined,
     hasAllParams: true,
     ...
   }
   ```

5. **AuditForm initiates template fetch**
   ```
   [AuditForm] Mode: Creating new audit from template, templateId: <number> type: <type>
   [AuditForm] Fetching template: {
     templateId: <number>,
     type: "<type>",
     hasExistingData: false,
     apiUrl: "http://..."
   }
   [AuditForm] Making API call to: http://localhost:8000/api/checklists/<number>
   [AuditForm] API response received in <ms>ms, status: 200
   [AuditForm] Template loaded successfully: {
     name: "<template name>",
     itemCount: <number>,
     templateId: <number>
   }
   ```

6. **Form displays**
   ```
   [AuditForm] Found X categories: Category1, Category2, Category3
   [AuditForm] Auto-selected single category: (or multiple categories shown)
   ```

## Common Issues & Solutions

### Issue 1: Route params not received
**Log shows:**
```
[AuditForm] CRITICAL: No templateId, auditId, or scheduledAuditId in route params
[AuditForm] Route params received: {
  templateId: undefined,
  hasAllParams: false
}
```

**Cause:** Navigation from CategorySelectionScreen isn't passing templateId

**Solution:**
- Check that handleTemplateSelect is being called with valid template
- Verify template.id is a number (not undefined)
- Try the "Retry" button on error screen

### Issue 2: Template ID is string instead of number
**Log shows:**
```
[AuditForm] Route params received: {
  templateId: "123",
  templateIdType: "string"
}
```

**Note:** This should still work (parseInt converts it), but indicates data type mismatch

### Issue 3: API call fails
**Log shows:**
```
[AuditForm] Error fetching template: {
  message: "...",
  code: "ECONNABORTED" or similar,
  status: 404 or 500,
  url: "http://localhost:8000/api/checklists/123"
}
```

**Solution by status code:**
- **404 Not Found**: Template ID doesn't exist on server
- **500 Server Error**: Backend issue
- **ECONNABORTED/timeout**: Network issue or backend slow
- **Cannot reach API URL**: Backend not running

### Issue 4: Invalid template response
**Log shows:**
```
[AuditForm] Temperature response structure validation failed
```

**Cause:** API returned template in unexpected format

**Solution:** Rebuild APK and restart the app

## Testing Steps

### Step 1: Enable Console Logging
- Open Expo Go on your phone
- Go to Settings → Enable Debug in console

### Step 2: Reproduce the issue
1. Open app
2. Tap "New" button
3. Select any category
4. Select any template
5. Watch console for logs

### Step 3: Identify the issue
- Look for error logs starting with `[AuditForm] Error`
- Check the context around the error
- Match against "Common Issues" above

### Step 4: Share logs with developer
- Copy console output including:
  - All `[AuditForm]` and `[CategorySelectionScreen]` logs
  - Any error messages
  - Timestamp and order of events

## Quick Diagnostic Commands

### Check if backend is running
```bash
curl http://localhost:8000/api/templates | jq '.templates[0]'
```
Should return a template object with `id`, `name`, `categories`, etc.

### Check if specific template exists
```bash
curl http://localhost:8000/api/checklists/{templateId}
```
Where `{templateId}` is the number from your console log

### Test template navigation directly
From any audit screen, manually pass templateId:
```javascript
navigation.navigate('AuditForm', { templateId: 1 })
```

## Checklist for User

When reporting an issue, please provide:
- [ ] Console logs from Expo Go (screenshot or paste)
- [ ] Your template/checklist ID (visible in console logs)
- [ ] Device OS and Expo Go version
- [ ] Whether backend API is accessible (can test with curl above)
- [ ] Network status (WiFi/mobile data, any VPN)
- [ ] Steps to reproduce exactly

## Next Steps

After gathering diagnostics:
1. Check if templateId is being passed correctly
2. Verify API is returning valid template data
3. Confirm network connection
4. Try "Retry" button on error screen
5. If persists, check backend logs for errors
