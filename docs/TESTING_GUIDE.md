# Testing Guide

This guide explains how to test all features and permissions in the audit checklist application.

## Quick Start

### Automated Testing

1. **Start the backend server:**
   ```bash
   cd backend
   npm start
   ```

2. **Run automated tests:**
   ```bash
   node tests/run-tests.js
   ```

3. **Run with verbose output:**
   ```bash
   node tests/run-tests.js --verbose
   ```

### Manual Testing

Follow the comprehensive checklist in `tests/manual-testing-checklist.md`.

## Test Structure

### 1. Automated Test Suite (`tests/permissions.test.js`)

The automated test suite covers:
- ✅ Login and authentication
- ✅ Checklist/Template permissions (display, edit, delete)
- ✅ Scheduled audit permissions (view, start, create)
- ✅ Audit permissions (view, create, delete)
- ✅ Action plans permissions
- ✅ Location permissions
- ✅ Admin-only endpoints (users, roles)

**To run:**
```bash
node tests/permissions.test.js
```

### 2. Manual Testing Checklist (`tests/manual-testing-checklist.md`)

Comprehensive manual testing checklist covering:
- Navigation and menu visibility
- Web application features
- Mobile app features
- API endpoint testing
- Edge cases
- Security testing

## Test Users Setup

Before running tests, ensure these test users exist:

### Admin User
- **Email:** `admin@test.com`
- **Password:** `password123`
- **Role:** `admin`
- **Expected Permissions:** All (`*`)

### Manager User
- **Email:** `manager@test.com`
- **Password:** `password123`
- **Role:** `manager`
- **Expected Permissions:** 
  - `display_templates`, `edit_templates`, `delete_templates`
  - `start_scheduled_audits`, `manage_scheduled_audits`
  - `view_audits`, `manage_audits`
  - `view_locations`, `manage_locations`
  - `view_analytics`, `export_data`

### Auditor User
- **Email:** `auditor@test.com`
- **Password:** `password123`
- **Role:** `auditor`
- **Expected Permissions:**
  - `display_templates`
  - `start_scheduled_audits`, `view_scheduled_audits`
  - `view_audits`, `create_audits`
  - `view_actions`, `manage_actions`

### Regular User
- **Email:** `user@test.com`
- **Password:** `password123`
- **Role:** `user`
- **Expected Permissions:**
  - `view_own_audits`
  - `view_actions`, `create_actions`
  - `view_tasks`, `update_tasks`

## Test Scenarios

### Scenario 1: Checklist Permissions

**Test Display Permission:**
1. Login as Auditor
2. Navigate to `/checklists`
3. ✅ Should see templates list
4. ✅ Should NOT see Add/Edit/Delete buttons

**Test Edit Permission:**
1. Login as Manager
2. Navigate to `/checklists`
3. ✅ Should see Add Template button
4. ✅ Should see Edit icon on templates
5. ✅ Should be able to create/edit templates

**Test Delete Permission:**
1. Login as Manager
2. Navigate to `/checklists`
3. ✅ Should see Delete icon on templates
4. ✅ Should be able to delete templates

### Scenario 2: Scheduled Audit Start Permission

**Test Without Permission:**
1. Login as Regular User
2. Navigate to `/scheduled`
3. ✅ Should see scheduled audits
4. ❌ Should NOT see "Start Audit" button
5. Try to start audit via API
6. ❌ Should get 403 Forbidden

**Test With Permission:**
1. Login as Auditor
2. Navigate to `/scheduled`
3. ✅ Should see scheduled audits
4. ✅ Should see "Start Audit" button
5. Click "Start Audit"
6. ✅ Should open audit form
7. Complete and save
8. ✅ Should create audit successfully

### Scenario 3: Admin-Only Features

**Test User Management:**
1. Login as Admin
2. Navigate to `/users`
3. ✅ Should see users list
4. ✅ Should be able to create/edit/delete users

1. Login as Manager
2. Navigate to `/users`
3. ❌ Should get 403 or redirect

**Test Role Management:**
1. Login as Admin
2. Navigate to `/roles`
3. ✅ Should see roles list
4. ✅ Should be able to create/edit/delete roles

1. Login as Manager
2. Navigate to `/roles`
3. ❌ Should get 403 or redirect

## API Testing with Postman/curl

### Example: Test Checklist Permissions

**As Auditor (display only):**
```bash
# Should succeed
curl -X GET http://localhost:5000/api/checklists \
  -H "Authorization: Bearer <auditor_token>"

# Should fail (403)
curl -X POST http://localhost:5000/api/checklists \
  -H "Authorization: Bearer <auditor_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Template", "items": []}'
```

**As Manager (full access):**
```bash
# Should succeed
curl -X GET http://localhost:5000/api/checklists \
  -H "Authorization: Bearer <manager_token>"

# Should succeed
curl -X POST http://localhost:5000/api/checklists \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Template", "items": []}'
```

### Example: Test Scheduled Audit Start

**As Regular User (no permission):**
```bash
# Should fail (403)
curl -X POST http://localhost:5000/api/audits \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": 1,
    "restaurant_name": "Test Restaurant",
    "scheduled_audit_id": 1
  }'
```

**As Auditor (has permission):**
```bash
# Should succeed
curl -X POST http://localhost:5000/api/audits \
  -H "Authorization: Bearer <auditor_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": 1,
    "restaurant_name": "Test Restaurant",
    "scheduled_audit_id": 1
  }'
```

## Mobile App Testing

### Test Scheduled Audits on Mobile

1. **Open mobile app**
2. **Login as Auditor**
3. **Navigate to Scheduled Audits tab**
4. ✅ Should see scheduled audits
5. ✅ Should see "Start Audit" button
6. **Tap "Start Audit"**
7. ✅ Should open audit form
8. **Complete audit**
9. ✅ Should save successfully

1. **Login as Regular User**
2. **Navigate to Scheduled Audits tab**
3. ✅ Should see scheduled audits (own)
4. ❌ Should NOT see "Start Audit" button

## Expected Test Results

### Automated Tests
- **Total Tests:** ~30-40 test cases
- **Expected Pass Rate:** 100%
- **Test Duration:** ~30-60 seconds

### Manual Tests
- **Total Test Cases:** ~100+ scenarios
- **Estimated Time:** 2-3 hours for complete coverage

## Troubleshooting

### Tests Failing

1. **Check backend server is running:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Verify test users exist:**
   - Check database for test users
   - Verify roles and permissions are correct

3. **Check test data:**
   - Ensure templates exist
   - Ensure scheduled audits exist
   - Ensure locations exist

4. **Check permissions:**
   - Verify role permissions in database
   - Check permission middleware is working

### Common Issues

**Issue: 403 Forbidden on all requests**
- **Solution:** Check JWT token is valid
- **Solution:** Verify user has correct role

**Issue: Tests pass but UI doesn't reflect permissions**
- **Solution:** Clear browser cache
- **Solution:** Check frontend permission utilities
- **Solution:** Verify user permissions are in JWT token

**Issue: Mobile app not respecting permissions**
- **Solution:** Check mobile app is using latest API
- **Solution:** Verify permissions are checked on mobile
- **Solution:** Check mobile app error handling

## Test Coverage

### Backend Coverage
- ✅ All route permissions
- ✅ Permission middleware
- ✅ Permission hierarchy
- ✅ Admin checks
- ✅ Ownership checks

### Frontend Coverage
- ✅ Menu visibility
- ✅ Button visibility
- ✅ Form access
- ✅ Navigation restrictions
- ✅ Permission utilities

### Mobile Coverage
- ✅ Tab visibility
- ✅ Button visibility
- ✅ Feature access
- ✅ Error handling

## Continuous Testing

### Recommended Testing Schedule

- **Before each release:** Run full test suite
- **After permission changes:** Run permission-specific tests
- **After new features:** Add new test cases
- **Weekly:** Run automated tests
- **Monthly:** Complete manual testing checklist

### Test Maintenance

- Update test users if roles change
- Update test data if schema changes
- Update test cases if features change
- Review and update test coverage regularly

## Additional Resources

- **Testing Plan:** `docs/PERMISSIONS_TESTING_PLAN.md`
- **Manual Checklist:** `tests/manual-testing-checklist.md`
- **Permissions Documentation:** `docs/GRANULAR_PERMISSIONS_UPDATE.md`
- **Test Script:** `tests/permissions.test.js`

