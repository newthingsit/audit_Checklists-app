const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');

const router = express.Router();

// Get all roles (admin only)
router.get('/', authenticate, requireAdmin, (req, res) => {
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
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    // Parse permissions JSON for each role
    const rolesWithParsedPermissions = roles.map(role => ({
      ...role,
      permissions: role.permissions ? JSON.parse(role.permissions) : []
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
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Parse permissions JSON
    const roleWithParsedPermissions = {
      ...role,
      permissions: role.permissions ? JSON.parse(role.permissions) : []
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
      const permissionsJson = permissions ? JSON.stringify(permissions) : JSON.stringify([]);
      
      dbInstance.run(
        'INSERT INTO roles (name, display_name, description, permissions, is_system_role) VALUES (?, ?, ?, ?, 0)',
        [name, display_name, description || '', permissionsJson],
        function(err) {
          if (err) {
            console.error('Error creating role:', err);
            return res.status(500).json({ error: 'Error creating role', details: err.message });
          }
          
          // Return the created role with parsed permissions
          dbInstance.get('SELECT * FROM roles WHERE id = ?', [this.lastID], (err, role) => {
            if (err) {
              return res.status(201).json({ 
                id: this.lastID, 
                message: 'Role created successfully',
                role: { id: this.lastID, name, display_name, description, permissions: permissions || [] }
              });
            }
            
            const roleWithParsedPermissions = {
              ...role,
              permissions: role.permissions ? JSON.parse(role.permissions) : []
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
        params.push(JSON.stringify(permissions));
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
            return res.status(500).json({ error: 'Error updating role', details: err.message });
          }
          
          // Return updated role
          dbInstance.get('SELECT * FROM roles WHERE id = ?', [id], (err, updatedRole) => {
            if (err) {
              return res.json({ message: 'Role updated successfully' });
            }
            
            const roleWithParsedPermissions = {
              ...updatedRole,
              permissions: updatedRole.permissions ? JSON.parse(updatedRole.permissions) : []
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
          return res.status(500).json({ error: 'Error deleting role', details: err.message });
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
        { id: 'users.create', name: 'Create Users', description: 'Add new users' },
        { id: 'users.edit', name: 'Edit Users', description: 'Update existing users' },
        { id: 'users.delete', name: 'Delete Users', description: 'Remove users' }
      ]
    },
    {
      id: 'manage_roles',
      name: 'Manage Roles',
      description: 'Create, edit, and delete roles',
      children: [
        { id: 'roles.create', name: 'Create Roles', description: 'Add new roles' },
        { id: 'roles.edit', name: 'Edit Roles', description: 'Update existing roles' },
        { id: 'roles.delete', name: 'Delete Roles', description: 'Remove roles' }
      ]
    },
    {
      id: 'manage_audits',
      name: 'Manage Audits',
      description: 'Create, edit, and delete audits',
      children: [
        { id: 'audits.create', name: 'Create Audits', description: 'Create new audits' },
        { id: 'audits.edit', name: 'Edit Audits', description: 'Update audits' },
        { id: 'audits.delete', name: 'Delete Audits', description: 'Remove audits' }
      ]
    },
    {
      id: 'manage_templates',
      name: 'Manage Templates',
      description: 'Create, edit, and delete checklist templates',
      children: [
        { id: 'templates.create', name: 'Create Templates', description: 'Add new templates' },
        { id: 'templates.edit', name: 'Edit Templates', description: 'Update existing templates' },
        { id: 'templates.delete', name: 'Delete Templates', description: 'Remove templates' }
      ]
    },
    {
      id: 'manage_locations',
      name: 'Manage Stores',
      description: 'Create, edit, and delete stores',
      children: [
        { id: 'locations.create', name: 'Create Stores', description: 'Add new stores' },
        { id: 'locations.edit', name: 'Edit Stores', description: 'Update stores' },
        { id: 'locations.delete', name: 'Delete Stores', description: 'Remove stores' }
      ]
    },
    {
      id: 'manage_actions',
      name: 'Manage Actions',
      description: 'Create, edit, and delete action items',
      children: [
        { id: 'actions.create', name: 'Create Actions', description: 'Add new action items' },
        { id: 'actions.edit', name: 'Edit Actions', description: 'Update action items' },
        { id: 'actions.delete', name: 'Delete Actions', description: 'Remove action items' }
      ]
    },
    { id: 'view_analytics', name: 'View Analytics', description: 'Access analytics and reports' },
    { id: 'export_data', name: 'Export Data', description: 'Export audits and reports' },
    { id: 'view_audits', name: 'View Audits', description: 'View all audits' },
    { id: 'view_own_audits', name: 'View Own Audits', description: 'View only own audits' }
  ];

  res.json({ permissions });
});

module.exports = router;

