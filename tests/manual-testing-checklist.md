# Manual Testing Checklist

Use this checklist for manual testing of permissions and features.

## Pre-Test Setup

- [ ] Backend server is running on port 5000
- [ ] Frontend web app is running on port 3000
- [ ] Mobile app is connected and running
- [ ] Test users are created:
  - [ ] admin@test.com (Admin role)
  - [ ] manager@test.com (Manager role)
  - [ ] auditor@test.com (Auditor role)
  - [ ] user@test.com (User role)
- [ ] Test data exists:
  - [ ] At least 2 checklist templates
  - [ ] At least 1 scheduled audit
  - [ ] At least 1 location/store
  - [ ] At least 1 audit (created by test user)

## Web Application Testing

### Navigation & Menu Visibility

#### Admin User (admin@test.com)
- [ ] Login as admin
- [ ] Verify all menu items are visible:
  - [ ] Dashboard
  - [ ] Checklists
  - [ ] Audit History
  - [ ] Scheduled
  - [ ] Tasks
  - [ ] Action Plans
  - [ ] Stores
  - [ ] Analytics
  - [ ] Monthly Scorecard
  - [ ] Profile
  - [ ] Users
  - [ ] Roles

#### Manager User (manager@test.com)
- [ ] Login as manager
- [ ] Verify menu items:
  - [ ] Checklists (visible)
  - [ ] Scheduled (visible)
  - [ ] Tasks (visible)
  - [ ] Action Plans (visible)
  - [ ] Stores (visible)
  - [ ] Analytics (visible)
  - [ ] Users (NOT visible)
  - [ ] Roles (NOT visible)

#### Auditor User (auditor@test.com)
- [ ] Login as auditor
- [ ] Verify menu items:
  - [ ] Checklists (visible)
  - [ ] Scheduled (visible)
  - [ ] Tasks (visible)
  - [ ] Action Plans (visible)
  - [ ] Stores (NOT visible)
  - [ ] Analytics (NOT visible)
  - [ ] Users (NOT visible)
  - [ ] Roles (NOT visible)

#### Regular User (user@test.com)
- [ ] Login as user
- [ ] Verify menu items:
  - [ ] Checklists (NOT visible)
  - [ ] Scheduled (NOT visible)
  - [ ] Tasks (visible)
  - [ ] Action Plans (visible)
  - [ ] Stores (NOT visible)
  - [ ] Analytics (NOT visible)
  - [ ] Users (NOT visible)
  - [ ] Roles (NOT visible)

### Checklists Page Testing

#### Manager User
- [ ] Navigate to /checklists
- [ ] Verify "Add Template" button is visible
- [ ] Verify "Import CSV" button is visible
- [ ] Verify Edit icon is visible on template cards
- [ ] Verify Delete icon is visible on template cards
- [ ] Click "Add Template"
- [ ] Create a new template
- [ ] Verify template appears in list
- [ ] Click Edit icon on a template
- [ ] Modify template and save
- [ ] Verify changes are saved
- [ ] Click Delete icon on a template
- [ ] Confirm deletion
- [ ] Verify template is removed

#### Auditor User
- [ ] Navigate to /checklists
- [ ] Verify "Add Template" button is NOT visible
- [ ] Verify "Import CSV" button is NOT visible
- [ ] Verify Edit icon is NOT visible on template cards
- [ ] Verify Delete icon is NOT visible on template cards
- [ ] Verify templates are visible (read-only)
- [ ] Click on a template
- [ ] Verify template details are visible
- [ ] Verify "Start Audit" button is visible

#### Regular User
- [ ] Try to navigate to /checklists directly
- [ ] Verify access is denied or redirected
- [ ] Verify Checklists menu item is NOT visible

### Scheduled Audits Page Testing

#### Manager User
- [ ] Navigate to /scheduled
- [ ] Verify scheduled audits list is visible
- [ ] Verify "Start Audit" button is visible for pending audits
- [ ] Click "Start Audit" on a pending scheduled audit
- [ ] Verify audit form opens
- [ ] Complete and save audit
- [ ] Verify audit is created and linked to scheduled audit

#### Auditor User
- [ ] Navigate to /scheduled
- [ ] Verify scheduled audits list is visible (own audits)
- [ ] Verify "Start Audit" button is visible for pending audits
- [ ] Click "Start Audit" on a pending scheduled audit
- [ ] Verify audit form opens
- [ ] Complete and save audit
- [ ] Verify audit is created

#### Regular User
- [ ] Navigate to /scheduled
- [ ] Verify scheduled audits list is visible (own audits only)
- [ ] Verify "Start Audit" button is NOT visible
- [ ] Try to start audit via direct URL
- [ ] Verify error message or 403 response

### Audit History Testing

#### All Users
- [ ] Navigate to /audits
- [ ] Verify own audits are visible
- [ ] Click on an audit
- [ ] Verify audit details are visible

#### Manager/Admin
- [ ] Navigate to /audits
- [ ] Verify all audits are visible (not just own)
- [ ] Verify filter/search works for all audits

#### Regular User
- [ ] Navigate to /audits
- [ ] Verify only own audits are visible
- [ ] Verify cannot see other users' audits

### Action Plans Testing

#### All Users with view_actions
- [ ] Navigate to /actions
- [ ] Verify action plans list is visible
- [ ] Click on an action plan
- [ ] Verify action details are visible

#### Users with create_actions
- [ ] Navigate to /actions
- [ ] Create new action plan
- [ ] Verify action is created and appears in list

#### Users with manage_actions
- [ ] Navigate to /actions
- [ ] Edit an action plan
- [ ] Verify changes are saved
- [ ] Delete an action plan
- [ ] Verify action is removed

### Stores/Locations Testing

#### Users with view_locations
- [ ] Navigate to /stores
- [ ] Verify locations list is visible
- [ ] Click on a location
- [ ] Verify location details are visible

#### Users with manage_locations
- [ ] Navigate to /stores
- [ ] Create new location
- [ ] Verify location is created
- [ ] Edit location
- [ ] Verify changes are saved
- [ ] Delete location
- [ ] Verify location is removed

### Analytics Testing

#### Users with view_analytics
- [ ] Navigate to /analytics
- [ ] Verify analytics dashboard is visible
- [ ] Verify charts and reports are displayed

#### Users without view_analytics
- [ ] Verify Analytics menu item is NOT visible
- [ ] Try to navigate to /analytics directly
- [ ] Verify access is denied or redirected

### User Management Testing (Admin Only)

- [ ] Login as admin
- [ ] Navigate to /users
- [ ] Verify users list is visible
- [ ] Create new user
- [ ] Verify user is created
- [ ] Edit user
- [ ] Verify changes are saved
- [ ] Delete user
- [ ] Verify user is removed

- [ ] Login as non-admin
- [ ] Verify Users menu item is NOT visible
- [ ] Try to navigate to /users directly
- [ ] Verify access is denied (403)

### Role Management Testing (Admin Only)

- [ ] Login as admin
- [ ] Navigate to /roles
- [ ] Verify roles list is visible
- [ ] Verify permissions are displayed for each role
- [ ] Create new role
- [ ] Assign permissions to role
- [ ] Verify role is created
- [ ] Edit role permissions
- [ ] Verify changes are saved
- [ ] Delete non-system role
- [ ] Verify role is removed
- [ ] Try to delete system role
- [ ] Verify deletion is prevented

- [ ] Login as non-admin
- [ ] Verify Roles menu item is NOT visible
- [ ] Try to navigate to /roles directly
- [ ] Verify access is denied (403)

## Mobile App Testing

### Scheduled Audits (Mobile)

#### Auditor/Manager
- [ ] Login on mobile app
- [ ] Navigate to Scheduled Audits tab
- [ ] Verify scheduled audits are visible
- [ ] Click on a scheduled audit
- [ ] Verify "Start Audit" button is visible
- [ ] Start audit
- [ ] Complete audit
- [ ] Verify audit is saved

#### Regular User
- [ ] Login on mobile app
- [ ] Navigate to Scheduled Audits tab
- [ ] Verify scheduled audits are visible (own audits)
- [ ] Verify "Start Audit" button is NOT visible
- [ ] Try to start audit
- [ ] Verify error message or 403 response

### Audit History (Mobile)

#### All Users
- [ ] Login on mobile app
- [ ] Navigate to Audit History tab
- [ ] Verify own audits are visible
- [ ] Click on an audit
- [ ] Verify audit details are visible

### Tasks (Mobile)

#### Users with view_tasks
- [ ] Login on mobile app
- [ ] Navigate to Tasks tab
- [ ] Verify tasks are visible
- [ ] Click on a task
- [ ] Verify task details are visible

## API Testing (Using Postman/curl)

### Checklist Endpoints

- [ ] GET /api/checklists (Auditor) - Should return 200
- [ ] GET /api/checklists (User) - Should return 403 or 200 (depending on permissions)
- [ ] POST /api/checklists (Auditor) - Should return 403
- [ ] POST /api/checklists (Manager) - Should return 201
- [ ] PUT /api/checklists/:id (Auditor) - Should return 403
- [ ] PUT /api/checklists/:id (Manager) - Should return 200
- [ ] DELETE /api/checklists/:id (Auditor) - Should return 403
- [ ] DELETE /api/checklists/:id (Manager) - Should return 200

### Scheduled Audit Endpoints

- [ ] GET /api/scheduled-audits (All users) - Should return 200
- [ ] POST /api/audits with scheduled_audit_id (User) - Should return 403
- [ ] POST /api/audits with scheduled_audit_id (Auditor) - Should return 201
- [ ] POST /api/scheduled-audits (Manager) - Should return 201
- [ ] POST /api/scheduled-audits (Auditor) - Should return 403

### Audit Endpoints

- [ ] GET /api/audits (All users) - Should return 200
- [ ] POST /api/audits without scheduled_audit_id (All users) - Should return 201
- [ ] DELETE /api/audits/:id (User, own audit) - Should return 200
- [ ] DELETE /api/audits/:id (User, other's audit) - Should return 403
- [ ] DELETE /api/audits/:id (Admin, any audit) - Should return 200

### Action Plans Endpoints

- [ ] GET /api/actions (All users with view_actions) - Should return 200
- [ ] POST /api/actions (Users with create_actions) - Should return 201
- [ ] POST /api/actions (Users without create_actions) - Should return 403
- [ ] PUT /api/actions/:id (Users with manage_actions) - Should return 200
- [ ] DELETE /api/actions/:id (Users with manage_actions) - Should return 200

### Location Endpoints

- [ ] GET /api/locations (Users with view_locations) - Should return 200
- [ ] GET /api/locations (Users without view_locations) - Should return 403
- [ ] POST /api/locations (Users with manage_locations) - Should return 201
- [ ] POST /api/locations (Users without manage_locations) - Should return 403

### User Management Endpoints (Admin Only)

- [ ] GET /api/users (Admin) - Should return 200
- [ ] GET /api/users (Manager) - Should return 403
- [ ] POST /api/users (Admin) - Should return 201
- [ ] POST /api/users (Manager) - Should return 403

### Role Management Endpoints (Admin Only)

- [ ] GET /api/roles (Admin) - Should return 200
- [ ] GET /api/roles (Manager) - Should return 403
- [ ] POST /api/roles (Admin) - Should return 201
- [ ] POST /api/roles (Manager) - Should return 403

## Edge Cases Testing

- [ ] Test permission inheritance (manage_templates includes all template permissions)
- [ ] Test wildcard permission (*) for admin
- [ ] Test multiple permissions on same user
- [ ] Test permission changes take effect immediately
- [ ] Test permission checks on nested resources
- [ ] Test permission checks with invalid tokens
- [ ] Test permission checks with expired tokens
- [ ] Test permission checks with missing tokens

## Performance Testing

- [ ] Test permission checks don't significantly slow down API responses
- [ ] Test permission checks don't cause N+1 query problems
- [ ] Test permission caching (if implemented)

## Security Testing

- [ ] Test that users cannot bypass permissions by manipulating requests
- [ ] Test that permission checks are enforced on both frontend and backend
- [ ] Test that permission errors don't leak sensitive information
- [ ] Test that permission checks work correctly with concurrent requests

## Notes

- Document any issues found during testing
- Note any permission inconsistencies
- Record any performance issues
- Document any edge cases that need additional handling

