const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requirePermission, normalizePermissionList } = require('../middleware/permissions');

const router = express.Router();

// Get all roles (admin or users with view_users, manage_users, or create_users permission - needed to assign roles)
router.get('/', authenticate, requirePermission('view_users', 'manage_users', 'create_users'), (req, res) => {
  const dbInstance = db.getDb();
  const { search } = req.query;

  let query = 'SELECT * FROM roles WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY is_system_role DESC, name ASC';

  dbInstance.all(query, params, (err, roles) => {
    if (err) {
      console.error('Error fetching roles:', err);
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Parse permissions JSON for each role
    const rolesWithParsedPermissions = roles.map(role => ({
      ...role,
      permissions: role.permissions ? normalizePermissionList(JSON.parse(role.permissions)) : []
    }));
    
    res.json({ roles: rolesWithParsedPermissions });
  });
});

// Get single role (admin only)
router.get('/:id', authenticate, requireAdmin, (req, res) => {
  const dbInstance = db.getDb();
  const { id } = req.params;

  dbInstance.get('SELECT * FROM roles WHERE id = ?', [id], (err, role) => {
    if (err) {
      console.error('Error fetching role:', err);
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Parse permissions JSON
    const roleWithParsedPermissions = {
      ...role,
      permissions: role.permissions ? normalizePermissionList(JSON.parse(role.permissions)) : []
    };
    
    res.json({ role: roleWithParsedPermissions });
  });
});

// Create new role (admin only)
router.post('/', authenticate, requireAdmin, [
  body('name').trim().notEmpty().matches(/^[a-z0-9_]+$/).withMessage('Name must contain only lowercase letters, numbers, and underscores'),
  body('display_name').trim().notEmpty(),
  body('description').optional().trim(),
  body('permissions').optional().isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, display_name, description, permissions } = req.body;
  const dbInstance = db.getDb();

  // Check if role name already exists
  dbInstance.get('SELECT * FROM roles WHERE name = ?', [name], async (err, existingRole) => {
    if (err) {
      console.error('Error checking existing role:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (existingRole) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }

    try {
      const normalizedPermissions = normalizePermissionList(permissions || []);
      const permissionsJson = JSON.stringify(normalizedPermissions);
      
      dbInstance.run(
        'INSERT INTO roles (name, display_name, description, permissions, is_system_role) VALUES (?, ?, ?, ?, 0)',
        [name, display_name, description || '', permissionsJson],
        function(err) {
          if (err) {
            console.error('Error creating role:', err);
            console.error('Error creating role:', err);
            return res.status(500).json({ error: 'Error creating role' });
          }
          
          // Return the created role with parsed permissions
          dbInstance.get('SELECT * FROM roles WHERE id = ?', [this.lastID], (err, role) => {
            if (err) {
              return res.status(201).json({ 
                id: this.lastID, 
                message: 'Role created successfully',
                role: { id: this.lastID, name, display_name, description, permissions: normalizedPermissions }
              });
            }
            
            const roleWithParsedPermissions = {
              ...role,
              permissions: role.permissions ? normalizePermissionList(JSON.parse(role.permissions)) : []
            };
            
            res.status(201).json({ 
              id: this.lastID, 
              message: 'Role created successfully',
              role: roleWithParsedPermissions
            });
          });
        }
      );
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ error: 'Error creating role' });
    }
  });
});

// Update role (admin only)
router.put('/:id', authenticate, requireAdmin, [
  body('display_name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('permissions').optional().isArray()
], async (req, res) => {
  // Log for debugging
  console.log('Update role request:', { id: req.params.id, user: req.user, body: req.body });
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { display_name, description, permissions } = req.body;
  const dbInstance = db.getDb();

  // Get current role
  dbInstance.get('SELECT * FROM roles WHERE id = ?', [id], async (err, role) => {
    if (err) {
      console.error('Error fetching role for update:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    try {
      const updates = [];
      const params = [];

      // For system roles, allow updating display_name, description, and permissions only
      // For custom roles, allow updating all fields
      if (display_name !== undefined) {
        updates.push('display_name = ?');
        params.push(display_name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (permissions !== undefined) {
        updates.push('permissions = ?');
        const normalizedPermissions = normalizePermissionList(permissions || []);
        params.push(JSON.stringify(normalizedPermissions));
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(id);

      dbInstance.run(
        `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function(err) {
          if (err) {
            console.error('Error updating role:', err);
            console.error('Error updating role:', err);
            return res.status(500).json({ error: 'Error updating role' });
          }
          
          // Return updated role
          dbInstance.get('SELECT * FROM roles WHERE id = ?', [id], (err, updatedRole) => {
            if (err) {
              return res.json({ message: 'Role updated successfully' });
            }
            
            const roleWithParsedPermissions = {
              ...updatedRole,
              permissions: updatedRole.permissions ? normalizePermissionList(JSON.parse(updatedRole.permissions)) : []
            };
            
            res.json({ message: 'Role updated successfully', role: roleWithParsedPermissions });
          });
        }
      );
    } catch (error) {
      console.error('Error updating role:', error);
      return res.status(500).json({ error: 'Error updating role' });
    }
  });
});

// Delete role (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const dbInstance = db.getDb();
  const { id } = req.params;

  // Check if role exists and is not a system role
  dbInstance.get('SELECT * FROM roles WHERE id = ?', [id], (err, role) => {
    if (err) {
      console.error('Error fetching role for deletion:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent deleting system roles
    if (role.is_system_role) {
      return res.status(403).json({ error: 'Cannot delete system roles' });
    }

    // Check if any users are using this role
    dbInstance.get('SELECT COUNT(*) as count FROM users WHERE role = ?', [role.name], (err, result) => {
      if (err) {
        console.error('Error checking role usage:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.count > 0) {
        return res.status(400).json({ 
          error: `Cannot delete role. ${result.count} user(s) are currently using this role. Please reassign users before deleting.` 
        });
      }

      // Delete role
      dbInstance.run('DELETE FROM roles WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Error deleting role:', err);
          console.error('Error deleting role:', err);
          return res.status(500).json({ error: 'Error deleting role' });
        }
        res.json({ message: 'Role deleted successfully' });
      });
    });
  });
});

// Get available permissions list
router.get('/permissions/list', authenticate, requireAdmin, (req, res) => {
  const permissions = [
    {
      id: 'manage_users',
      name: 'Manage Users',
      description: 'Create, edit, and delete users',
      children: [
        { id: 'create_users', name: 'Create Users', description: 'Add new users' },
        { id: 'edit_users', name: 'Edit Users', description: 'Update existing users' },
        { id: 'delete_users', name: 'Delete Users', description: 'Remove users' }
      ]
    },
    {
      id: 'manage_roles',
      name: 'Manage Roles',
      description: 'Create, edit, and delete roles',
      children: [
        { id: 'create_roles', name: 'Create Roles', description: 'Add new roles' },
        { id: 'edit_roles', name: 'Edit Roles', description: 'Update existing roles' },
        { id: 'delete_roles', name: 'Delete Roles', description: 'Remove roles' }
      ]
    },
    {
      id: 'manage_audits',
      name: 'Manage Audits',
      description: 'Create, edit, and delete audits',
      children: [
        { id: 'create_audits', name: 'Create Audits', description: 'Create new audits' },
        { id: 'edit_audits', name: 'Edit Audits', description: 'Update audits' },
        { id: 'delete_audits', name: 'Delete Audits', description: 'Remove audits' }
      ]
    },
    {
      id: 'manage_templates',
      name: 'Manage Templates',
      description: 'Full access to checklist templates (includes display, edit, delete)',
      children: [
        { id: 'display_templates', name: 'Display Templates', description: 'View checklist templates' },
        { id: 'view_templates', name: 'View Templates', description: 'View template details' },
        { id: 'create_templates', name: 'Create Templates', description: 'Add new templates' },
        { id: 'update_templates', name: 'Update Templates', description: 'Update existing templates' },
        { id: 'edit_templates', name: 'Edit Templates', description: 'Create and update templates' },
        { id: 'delete_templates', name: 'Delete Templates', description: 'Remove templates' }
      ]
    },
    {
      id: 'manage_locations',
      name: 'Manage Stores/Locations',
      description: 'Create, edit, and delete stores/locations',
      children: [
        { id: 'view_locations', name: 'View Stores', description: 'View locations list' },
        { id: 'create_locations', name: 'Create Stores', description: 'Add new stores' },
        { id: 'edit_locations', name: 'Edit Stores', description: 'Update stores' },
        { id: 'delete_locations', name: 'Delete Stores', description: 'Remove stores' }
      ]
    },
    {
      id: 'manage_actions',
      name: 'Manage Action Plans',
      description: 'Create, edit, and delete action items',
      children: [
        { id: 'view_actions', name: 'View Actions', description: 'View action items' },
        { id: 'create_actions', name: 'Create Actions', description: 'Add new action items' },
        { id: 'update_actions', name: 'Edit Actions', description: 'Update action items' },
        { id: 'delete_actions', name: 'Delete Actions', description: 'Remove action items' }
      ]
    },
    {
      id: 'manage_tasks',
      name: 'Manage Tasks',
      description: 'Create, edit, and delete tasks',
      children: [
        { id: 'view_tasks', name: 'View Tasks', description: 'View tasks' },
        { id: 'create_tasks', name: 'Create Tasks', description: 'Add new tasks' },
        { id: 'update_tasks', name: 'Edit Tasks', description: 'Update tasks' },
        { id: 'delete_tasks', name: 'Delete Tasks', description: 'Remove tasks' }
      ]
    },
    {
      id: 'manage_scheduled_audits',
      name: 'Manage Scheduled Audits',
      description: 'Full access to scheduled audits',
      children: [
        { id: 'view_scheduled_audits', name: 'View Scheduled Audits', description: 'View scheduled audits' },
        { id: 'create_scheduled_audits', name: 'Create Scheduled Audits', description: 'Create new scheduled audits' },
        { id: 'update_scheduled_audits', name: 'Update Scheduled Audits', description: 'Update scheduled audits' },
        { id: 'delete_scheduled_audits', name: 'Delete Scheduled Audits', description: 'Remove scheduled audits' },
        { id: 'start_scheduled_audits', name: 'Start Scheduled Audits', description: 'Start audits from scheduled audits' }
      ]
    },
    { id: 'view_scheduled_audits', name: 'View Scheduled Audits', description: 'View scheduled audits' },
    { id: 'start_scheduled_audits', name: 'Start Scheduled Audits', description: 'Start audits from scheduled audits (required to begin an audit from a scheduled audit)' },
    { id: 'display_templates', name: 'Display Templates', description: 'View checklist templates (read-only access)' },
    { id: 'edit_templates', name: 'Edit Templates', description: 'Create and update checklist templates' },
    { id: 'delete_templates', name: 'Delete Templates', description: 'Remove checklist templates' },
    { id: 'view_locations', name: 'View Stores', description: 'View stores/locations' },
    { id: 'view_actions', name: 'View Actions', description: 'View action items' },
    { id: 'view_tasks', name: 'View Tasks', description: 'View tasks' },
    { id: 'view_analytics', name: 'View Analytics', description: 'Access analytics and reports' },
    { id: 'export_data', name: 'Export Data', description: 'Export audits and reports' },
    { id: 'view_audits', name: 'View Audits', description: 'View all audits' },
    { id: 'view_own_audits', name: 'View Own Audits', description: 'View only own audits' }
  ];

  res.json({ permissions });
});

module.exports = router;

