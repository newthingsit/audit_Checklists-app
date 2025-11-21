# Enhanced Permissions System

## Overview

The application now features a comprehensive, granular permissions system that goes beyond simple role-based access control. Permissions are stored in the database and can be assigned to roles, allowing for fine-grained control over what users can do in the system.

## Key Features

### 1. **Permission-Based Middleware**

The enhanced permissions middleware (`backend/middleware/permissions.js`) provides:

- **`requirePermission(...permissions)`**: Checks if user has at least one of the specified permissions
- **`requireRole(...roles)`**: Checks if user has one of the specified roles
- **`requireOwnershipOrPermission(...permissions)`**: Allows access if user owns the resource OR has the required permission
- **`isAdminUser(user)`**: Helper to check if user is admin
- **`getUserPermissions(userId, role, callback)`**: Fetches user permissions from database
- **`hasPermission(userPermissions, requiredPermission)`**: Checks if permission array includes required permission

### 2. **Permission Hierarchy**

The system supports parent permissions. For example:
- If a user has `manage_audits`, they automatically have access to `view_audits`, `create_audits`, `update_audits`, and `delete_audits`
- This reduces the need to assign every individual permission

### 3. **Admin Bypass**

Administrators automatically have all permissions (wildcard `*`), bypassing all permission checks.

## Available Permissions

### Audit Permissions
- `manage_audits` - Full audit management (includes all audit permissions)
- `view_audits` - View audits
- `create_audits` - Create new audits
- `update_audits` - Update audits
- `delete_audits` - Delete audits
- `view_own_audits` - View only own audits

### Action Item Permissions
- `manage_actions` - Full action item management
- `view_actions` - View action items
- `create_actions` - Create action items
- `update_actions` - Update action items
- `delete_actions` - Delete action items

### Task Permissions
- `manage_tasks` - Full task management
- `view_tasks` - View tasks
- `create_tasks` - Create tasks
- `update_tasks` - Update tasks
- `delete_tasks` - Delete tasks

### Location Permissions
- `manage_locations` - Full location management
- `view_locations` - View locations
- `create_locations` - Create locations
- `update_locations` - Update locations
- `delete_locations` - Delete locations

### Template Permissions
- `manage_templates` - Full template management
- `view_templates` - View templates
- `create_templates` - Create templates
- `update_templates` - Update templates
- `delete_templates` - Delete templates

### User & Role Permissions
- `manage_users` - Full user management
- `manage_roles` - Full role management

### Analytics & Reports
- `view_analytics` - View analytics and reports
- `export_data` - Export data (CSV, PDF, etc.)

## Default Role Permissions

### Administrator
- **Permissions**: `*` (all permissions)
- **Access**: Full system access

### Manager
- **Permissions**: 
  - `manage_audits`, `view_audits`
  - `manage_locations`, `view_locations`
  - `manage_tasks`, `view_tasks`
  - `manage_actions`, `view_actions`
  - `view_analytics`, `export_data`
- **Access**: Can manage audits, locations, tasks, and actions. Can view analytics.

### Auditor
- **Permissions**:
  - `create_audits`, `view_audits`
  - `manage_actions`, `view_actions`
  - `create_tasks`, `view_tasks`, `update_tasks`
- **Access**: Can create and view audits, manage action items, and work with tasks.

### User
- **Permissions**:
  - `view_own_audits`
  - `create_actions`, `view_actions`
  - `view_tasks`, `update_tasks`
- **Access**: Basic access - can view own audits, create action items, and update assigned tasks.

## Implementation Examples

### Backend Route Protection

```javascript
const { requirePermission } = require('../middleware/permissions');

// Require specific permission
router.post('/actions', authenticate, requirePermission('manage_actions', 'create_actions'), (req, res) => {
  // Route handler
});

// Multiple permissions (OR logic - user needs at least one)
router.get('/audits', authenticate, requirePermission('view_audits', 'manage_audits'), (req, res) => {
  // Route handler
});
```

### Checking Permissions in Route Handlers

```javascript
const { getUserPermissions, hasPermission } = require('../middleware/permissions');

router.get('/some-route', authenticate, async (req, res) => {
  getUserPermissions(req.user.id, req.user.role, (err, permissions) => {
    if (hasPermission(permissions, 'view_analytics')) {
      // User can view analytics
    }
  });
});
```

## Routes with Permission Checks

### Actions (`/api/actions`)
- `POST /` - Requires `manage_actions` or `create_actions`
- `GET /` - Requires `view_actions` or `manage_actions`
- `PUT /:id` - Requires `manage_actions` or `update_actions`
- `DELETE /:id` - Requires `manage_actions` or `delete_actions`

### Tasks (`/api/tasks`)
- `GET /` - Requires `view_tasks` or `manage_tasks`
- `POST /` - Requires `manage_tasks` or `create_tasks`
- `PUT /:id` - Requires `manage_tasks` or `update_tasks`
- `DELETE /:id` - Requires `manage_tasks` or `delete_tasks`

### Locations (`/api/locations`)
- `GET /` - Requires `view_locations` or `manage_locations`
- `POST /` - Requires `manage_locations`
- `PUT /:id` - Requires `manage_locations`
- `DELETE /:id` - Requires `manage_locations`
- `POST /import` - Requires `manage_locations`

### Users (`/api/users`)
- All routes require `requireAdmin` (admin role only)

### Roles (`/api/roles`)
- All routes require `requireAdmin` (admin role only)

## Permission Checking Logic

1. **Admin Check**: If user is admin, all checks pass (wildcard `*`)
2. **Database Lookup**: Fetch permissions from `roles` table based on user's role
3. **Exact Match**: Check if permission array includes exact permission
4. **Parent Permission**: Check if permission array includes parent permission (e.g., `manage_audits` includes `view_audits`)
5. **Wildcard**: Check if permissions array includes `*` (all permissions)

## Future Enhancements

1. **Frontend Permission Checks**: Add permission-based UI hiding/showing
2. **Resource-Level Permissions**: Permissions for specific resources (e.g., can edit specific audit)
3. **Permission Groups**: Group related permissions together
4. **Audit Log**: Log permission checks and access attempts
5. **Dynamic Permissions**: Allow admins to create custom permissions

## Migration Notes

- Existing roles will be updated with new permissions on next database initialization
- For existing databases, you may need to manually update role permissions
- The system is backward compatible - routes without permission checks still work
- Admins always have full access regardless of permission assignments

