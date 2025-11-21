# Granular Permissions Update

## Overview

The permissions system has been updated to provide more granular control, especially for checklists and scheduled audits.

## New Permission Structure

### Checklist/Template Permissions

**Granular Permissions:**
- `display_templates` - View/display checklist templates (read-only)
- `edit_templates` - Create and update checklist templates
- `delete_templates` - Delete checklist templates

**Parent Permissions (include granular):**
- `view_templates` - Includes `display_templates`
- `manage_templates` - Includes `display_templates`, `edit_templates`, `delete_templates`

**Route Protection:**
- `GET /api/checklists` - Requires `display_templates`, `view_templates`, or `manage_templates`
- `GET /api/checklists/:id` - Requires `display_templates`, `view_templates`, or `manage_templates`
- `POST /api/checklists` - Requires `edit_templates`, `manage_templates`, or `create_templates`
- `POST /api/checklists/import` - Requires `edit_templates`, `manage_templates`, or `create_templates`
- `PUT /api/checklists/:id` - Requires `edit_templates`, `manage_templates`, or `update_templates`
- `DELETE /api/checklists/:id` - Requires `delete_templates` or `manage_templates`

### Scheduled Audit Permissions

**New Permission:**
- `start_scheduled_audits` - Required to start an audit from a scheduled audit

**Route Protection:**
- `GET /api/scheduled-audits` - No permission check (users see their own)
- `POST /api/audits` (with `scheduled_audit_id`) - Requires `start_scheduled_audits` or `manage_scheduled_audits`
- `POST /api/scheduled-audits` - Requires `manage_scheduled_audits` or `create_scheduled_audits`
- `PUT /api/scheduled-audits/:id` - Requires `manage_scheduled_audits` or `update_scheduled_audits`
- `DELETE /api/scheduled-audits/:id` - Requires `manage_scheduled_audits` or `delete_scheduled_audits`

## Updated Default Role Permissions

### Manager Role
- `display_templates` - Can view templates
- `edit_templates` - Can create and update templates
- `delete_templates` - Can delete templates
- `start_scheduled_audits` - Can start audits from scheduled audits

### Auditor Role
- `display_templates` - Can view templates
- `start_scheduled_audits` - Can start audits from scheduled audits

### User Role
- No template permissions (cannot view/edit/delete templates)
- No scheduled audit start permission (cannot start audits from scheduled audits)

## Frontend Permission Checks

### Checklists Page (`/checklists`)
- **Add Template Button**: Only shown if user has `edit_templates` or `manage_templates`
- **Import CSV Button**: Only shown if user has `edit_templates` or `manage_templates`
- **Edit Button**: Only shown if user has `edit_templates` or `manage_templates`
- **Delete Button**: Only shown if user has `delete_templates` or `manage_templates`

### Scheduled Audits Page (`/scheduled`)
- **Start Audit Button**: Only shown if user has `start_scheduled_audits` or `manage_scheduled_audits`
- Button is also hidden if schedule is not pending or user is not creator/assignee

### Layout Menu
- **Checklists Menu Item**: Only shown if user has `display_templates`, `view_templates`, or is admin

## Permission Hierarchy

The permission system supports hierarchical permissions:

1. **Wildcard**: `*` (admins) - All permissions
2. **Parent Permissions**: 
   - `manage_templates` includes: `display_templates`, `edit_templates`, `delete_templates`
   - `view_templates` includes: `display_templates`
   - `manage_scheduled_audits` includes: `start_scheduled_audits`
3. **Exact Match**: Specific permission names
4. **Special Mappings**: Defined in `hasPermission()` function for granular permissions

## Examples

### Example 1: User with only `display_templates`
- ✅ Can view checklist templates
- ❌ Cannot add/edit/delete templates
- ❌ Cannot start audits from scheduled audits

### Example 2: User with `edit_templates` and `start_scheduled_audits`
- ✅ Can view checklist templates
- ✅ Can create and update templates
- ❌ Cannot delete templates
- ✅ Can start audits from scheduled audits

### Example 3: User with `manage_templates`
- ✅ Can view checklist templates
- ✅ Can create and update templates
- ✅ Can delete templates
- ❌ Cannot start audits from scheduled audits (unless also has `start_scheduled_audits`)

## Migration Notes

- Existing roles will be updated with new permissions on next database initialization
- For existing databases, you may need to manually update role permissions
- The permission hierarchy ensures backward compatibility
- Admins always have all permissions regardless of assignments

