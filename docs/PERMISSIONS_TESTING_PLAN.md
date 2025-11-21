# Comprehensive Permissions & Features Testing Plan

## Test Overview

This document outlines comprehensive test scenarios for all permissions and features in the audit checklist application.

## Test Roles Setup

### Test Users to Create:
1. **Admin User** (`admin@test.com`)
   - Role: `admin`
   - Expected: All permissions (`*`)

2. **Manager User** (`manager@test.com`)
   - Role: `manager`
   - Expected: `display_templates`, `edit_templates`, `delete_templates`, `start_scheduled_audits`, `manage_scheduled_audits`, etc.

3. **Auditor User** (`auditor@test.com`)
   - Role: `auditor`
   - Expected: `display_templates`, `start_scheduled_audits`, `view_scheduled_audits`

4. **Regular User** (`user@test.com`)
   - Role: `user`
   - Expected: `view_own_audits`, `create_actions`, `view_actions`, `view_tasks`, `update_tasks`

5. **Limited User** (`limited@test.com`)
   - Role: `user` (or custom role with minimal permissions)
   - Expected: Only `view_own_audits`

## Test Scenarios

### 1. Checklist/Template Permissions

#### Test 1.1: Display Templates Permission
**User:** Auditor, Manager, Admin
**Steps:**
1. Login as test user
2. Navigate to `/checklists`
3. Verify checklist templates are visible
4. Click on a template to view details
5. Verify template details page loads

**Expected:**
- ✅ Templates list is visible
- ✅ Template details are accessible
- ✅ "Start Audit" button is visible

**User:** Regular User (no `display_templates`)
**Expected:**
- ❌ Checklists menu item should NOT appear in navigation
- ❌ Direct URL access should show 403 or redirect

#### Test 1.2: Edit Templates Permission
**User:** Manager, Admin
**Steps:**
1. Login as Manager/Admin
2. Navigate to `/checklists`
3. Verify "Add Template" button is visible
4. Verify "Import CSV" button is visible
5. Click "Add Template"
6. Create a new template
7. Verify template appears in list
8. Click edit icon on a template
9. Modify template and save
10. Verify changes are saved

**Expected:**
- ✅ "Add Template" button visible
- ✅ "Import CSV" button visible
- ✅ Edit icon visible on template cards
- ✅ Can create new templates
- ✅ Can update existing templates

**User:** Auditor (has `display_templates` but no `edit_templates`)
**Expected:**
- ❌ "Add Template" button NOT visible
- ❌ "Import CSV" button NOT visible
- ❌ Edit icon NOT visible on template cards
- ❌ Direct API call to create/edit should return 403

#### Test 1.3: Delete Templates Permission
**User:** Manager, Admin
**Steps:**
1. Login as Manager/Admin
2. Navigate to `/checklists`
3. Verify delete icon is visible on template cards
4. Click delete icon
5. Confirm deletion
6. Verify template is removed

**Expected:**
- ✅ Delete icon visible on template cards
- ✅ Can delete templates
- ✅ Template removed from list after deletion

**User:** Auditor (no `delete_templates`)
**Expected:**
- ❌ Delete icon NOT visible
- ❌ Direct API call to delete should return 403

### 2. Scheduled Audit Permissions

#### Test 2.1: View Scheduled Audits
**User:** All authenticated users
**Steps:**
1. Login as any user
2. Navigate to `/scheduled`
3. Verify scheduled audits are visible (own audits for non-admins)

**Expected:**
- ✅ Scheduled audits list is visible
- ✅ Users see their own scheduled audits
- ✅ Admins see all scheduled audits

#### Test 2.2: Start Scheduled Audit Permission
**User:** Auditor, Manager, Admin
**Steps:**
1. Login as Auditor/Manager/Admin
2. Navigate to `/scheduled`
3. Find a pending scheduled audit
4. Verify "Start Audit" button is visible
5. Click "Start Audit"
6. Verify audit form opens with template pre-filled
7. Complete and save audit
8. Verify audit is linked to scheduled audit

**Expected:**
- ✅ "Start Audit" button visible for pending audits
- ✅ Can start audit from scheduled audit
- ✅ Audit is created and linked correctly

**User:** Regular User (no `start_scheduled_audits`)
**Expected:**
- ❌ "Start Audit" button NOT visible
- ❌ Direct API call to create audit with `scheduled_audit_id` should return 403
- ❌ Error message: "You do not have permission to start scheduled audits"

#### Test 2.3: Create Scheduled Audit Permission
**User:** Manager, Admin
**Steps:**
1. Login as Manager/Admin
2. Navigate to `/scheduled`
3. Verify "Add Schedule" or create button is visible
4. Create a new scheduled audit
5. Verify scheduled audit appears in list

**Expected:**
- ✅ Can create scheduled audits
- ✅ Scheduled audit appears in list

**User:** Auditor (no `manage_scheduled_audits`)
**Expected:**
- ❌ Create button NOT visible
- ❌ Direct API call should return 403

### 3. Audit Permissions

#### Test 3.1: View Own Audits
**User:** All authenticated users
**Steps:**
1. Login as any user
2. Navigate to `/audits`
3. Verify own audits are visible
4. Click on an audit to view details

**Expected:**
- ✅ Own audits are visible
- ✅ Can view audit details

#### Test 3.2: View All Audits
**User:** Manager, Admin
**Steps:**
1. Login as Manager/Admin
2. Navigate to `/audits`
3. Verify all audits are visible (not just own)

**Expected:**
- ✅ All audits are visible
- ✅ Can filter and search all audits

**User:** Regular User
**Expected:**
- ✅ Only own audits visible
- ❌ Cannot see other users' audits

#### Test 3.3: Create Audit
**User:** All authenticated users (for regular audits)
**Steps:**
1. Login as any user
2. Navigate to `/checklists`
3. Click "Start Audit" on a template
4. Fill out audit form
5. Submit audit
6. Verify audit is created

**Expected:**
- ✅ Can create regular audits (without scheduled_audit_id)
- ✅ Audit is saved successfully

#### Test 3.4: Delete Audit
**User:** Admin (can delete any), Regular User (can delete own)
**Steps:**
1. Login as user
2. Navigate to `/audits`
3. Find own audit
4. Delete audit
5. Verify audit is removed

**Expected:**
- ✅ Users can delete their own audits
- ✅ Admins can delete any audit
- ❌ Users cannot delete other users' audits

### 4. Action Plans Permissions

#### Test 4.1: View Actions
**User:** All authenticated users with `view_actions`
**Steps:**
1. Login as user
2. Navigate to `/actions`
3. Verify action plans are visible

**Expected:**
- ✅ Action plans list is visible
- ✅ Can view action details

#### Test 4.2: Create Actions
**User:** Users with `create_actions` or `manage_actions`
**Steps:**
1. Login as user
2. Navigate to `/actions`
3. Create new action plan
4. Verify action is created

**Expected:**
- ✅ Can create action plans
- ✅ Action appears in list

#### Test 4.3: Manage Actions
**User:** Users with `manage_actions`
**Steps:**
1. Login as user
2. Navigate to `/actions`
3. Edit an action plan
4. Delete an action plan
5. Verify changes are saved

**Expected:**
- ✅ Can edit action plans
- ✅ Can delete action plans

### 5. Tasks Permissions

#### Test 5.1: View Tasks
**User:** Users with `view_tasks`
**Steps:**
1. Login as user
2. Navigate to `/tasks` (web) or Tasks tab (mobile)
3. Verify tasks are visible

**Expected:**
- ✅ Tasks list is visible
- ✅ Can view task details

#### Test 5.2: Manage Tasks
**User:** Users with `manage_tasks`
**Steps:**
1. Login as user
2. Navigate to `/tasks`
3. Create new task
4. Edit task
5. Delete task
6. Verify changes are saved

**Expected:**
- ✅ Can create tasks
- ✅ Can edit tasks
- ✅ Can delete tasks

### 6. Locations/Stores Permissions

#### Test 6.1: View Locations
**User:** Users with `view_locations`
**Steps:**
1. Login as user
2. Navigate to `/stores`
3. Verify locations are visible

**Expected:**
- ✅ Locations list is visible
- ✅ Can view location details

#### Test 6.2: Manage Locations
**User:** Users with `manage_locations`
**Steps:**
1. Login as user
2. Navigate to `/stores`
3. Create new location
4. Edit location
5. Delete location
6. Verify changes are saved

**Expected:**
- ✅ Can create locations
- ✅ Can edit locations
- ✅ Can delete locations

### 7. Analytics Permissions

#### Test 7.1: View Analytics
**User:** Users with `view_analytics`
**Steps:**
1. Login as user
2. Navigate to `/analytics`
3. Verify analytics dashboard is visible

**Expected:**
- ✅ Analytics page is accessible
- ✅ Charts and reports are visible

**User:** Users without `view_analytics`
**Expected:**
- ❌ Analytics menu item NOT visible
- ❌ Direct URL access should show 403

### 8. User Management Permissions

#### Test 8.1: View Users
**User:** Admin only
**Steps:**
1. Login as Admin
2. Navigate to `/users`
3. Verify users list is visible

**Expected:**
- ✅ Users list is visible
- ✅ Can view user details

**User:** Non-admin
**Expected:**
- ❌ Users menu item NOT visible
- ❌ Direct URL access should show 403

#### Test 8.2: Manage Users
**User:** Admin only
**Steps:**
1. Login as Admin
2. Navigate to `/users`
3. Create new user
4. Edit user
5. Delete user
6. Verify changes are saved

**Expected:**
- ✅ Can create users
- ✅ Can edit users
- ✅ Can delete users

### 9. Role Management Permissions

#### Test 9.1: View Roles
**User:** Admin only
**Steps:**
1. Login as Admin
2. Navigate to `/roles`
3. Verify roles list is visible

**Expected:**
- ✅ Roles list is visible
- ✅ Can view role details and permissions

**User:** Non-admin
**Expected:**
- ❌ Roles menu item NOT visible
- ❌ Direct URL access should show 403

#### Test 9.2: Manage Roles
**User:** Admin only
**Steps:**
1. Login as Admin
2. Navigate to `/roles`
3. Create new role
4. Edit role permissions
5. Delete role (non-system roles)
6. Verify changes are saved

**Expected:**
- ✅ Can create roles
- ✅ Can edit roles and permissions
- ✅ Can delete non-system roles
- ❌ Cannot delete system roles

### 10. Mobile App Permissions

#### Test 10.1: Mobile Scheduled Audits
**User:** Auditor, Manager, Admin
**Steps:**
1. Login on mobile app
2. Navigate to Scheduled Audits tab
3. Verify scheduled audits are visible
4. Click on a scheduled audit
5. Verify "Start Audit" button is visible (if has permission)
6. Start audit and complete it

**Expected:**
- ✅ Scheduled audits are visible
- ✅ Can start audit if has `start_scheduled_audits` permission
- ❌ Cannot start audit if no permission

**User:** Regular User (no `start_scheduled_audits`)
**Expected:**
- ✅ Scheduled audits are visible (own audits)
- ❌ "Start Audit" button NOT visible or disabled
- ❌ API call returns 403

#### Test 10.2: Mobile Audit History
**User:** All authenticated users
**Steps:**
1. Login on mobile app
2. Navigate to Audit History
3. Verify own audits are visible
4. Click on an audit to view details

**Expected:**
- ✅ Own audits are visible
- ✅ Can view audit details

### 11. API Endpoint Testing

#### Test 11.1: Checklist API Endpoints
Test all endpoints with different permission levels:

```bash
# Test with Auditor (display_templates only)
GET /api/checklists - Should return 200
GET /api/checklists/:id - Should return 200
POST /api/checklists - Should return 403
PUT /api/checklists/:id - Should return 403
DELETE /api/checklists/:id - Should return 403

# Test with Manager (edit_templates, delete_templates)
GET /api/checklists - Should return 200
POST /api/checklists - Should return 201
PUT /api/checklists/:id - Should return 200
DELETE /api/checklists/:id - Should return 200
```

#### Test 11.2: Scheduled Audit API Endpoints
```bash
# Test with Regular User (no start_scheduled_audits)
POST /api/audits (with scheduled_audit_id) - Should return 403

# Test with Auditor (has start_scheduled_audits)
POST /api/audits (with scheduled_audit_id) - Should return 201
```

### 12. Edge Cases

#### Test 12.1: Permission Inheritance
**Steps:**
1. Create custom role with `manage_templates` only
2. Assign to user
3. Verify user can display, edit, and delete templates
4. Verify permission hierarchy works

**Expected:**
- ✅ `manage_templates` includes all template permissions
- ✅ Permission hierarchy works correctly

#### Test 12.2: Wildcard Permission
**Steps:**
1. Login as Admin (has `*` permission)
2. Test all endpoints
3. Verify all operations work

**Expected:**
- ✅ Admin can access all endpoints
- ✅ Admin can perform all operations

#### Test 12.3: Multiple Permissions
**Steps:**
1. Create user with `display_templates` and `start_scheduled_audits`
2. Verify user can view templates
3. Verify user can start scheduled audits
4. Verify user cannot edit/delete templates

**Expected:**
- ✅ User can view templates
- ✅ User can start scheduled audits
- ❌ User cannot edit/delete templates

## Test Execution Checklist

- [ ] Test 1.1: Display Templates Permission
- [ ] Test 1.2: Edit Templates Permission
- [ ] Test 1.3: Delete Templates Permission
- [ ] Test 2.1: View Scheduled Audits
- [ ] Test 2.2: Start Scheduled Audit Permission
- [ ] Test 2.3: Create Scheduled Audit Permission
- [ ] Test 3.1: View Own Audits
- [ ] Test 3.2: View All Audits
- [ ] Test 3.3: Create Audit
- [ ] Test 3.4: Delete Audit
- [ ] Test 4.1: View Actions
- [ ] Test 4.2: Create Actions
- [ ] Test 4.3: Manage Actions
- [ ] Test 5.1: View Tasks
- [ ] Test 5.2: Manage Tasks
- [ ] Test 6.1: View Locations
- [ ] Test 6.2: Manage Locations
- [ ] Test 7.1: View Analytics
- [ ] Test 8.1: View Users
- [ ] Test 8.2: Manage Users
- [ ] Test 9.1: View Roles
- [ ] Test 9.2: Manage Roles
- [ ] Test 10.1: Mobile Scheduled Audits
- [ ] Test 10.2: Mobile Audit History
- [ ] Test 11.1: Checklist API Endpoints
- [ ] Test 11.2: Scheduled Audit API Endpoints
- [ ] Test 12.1: Permission Inheritance
- [ ] Test 12.2: Wildcard Permission
- [ ] Test 12.3: Multiple Permissions

## Automated Test Scripts

See `tests/permissions.test.js` for automated test scripts.

