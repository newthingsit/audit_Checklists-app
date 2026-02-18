/**
 * Permissions Utility Unit Tests
 * Tests permission checking logic
 */

import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isAdmin,
  hasRole,
} from '../../src/utils/permissions';

describe('permissions', () => {
  describe('hasPermission', () => {
    it('should return true for exact permission match', () => {
      const permissions = ['view_audits', 'create_audits'];
      expect(hasPermission(permissions, 'view_audits')).toBe(true);
      expect(hasPermission(permissions, 'create_audits')).toBe(true);
    });

    it('should return false when permission not in list', () => {
      const permissions = ['view_audits'];
      expect(hasPermission(permissions, 'delete_audits')).toBe(false);
    });

    it('should return true for wildcard permission', () => {
      const permissions = ['*'];
      expect(hasPermission(permissions, 'any_permission')).toBe(true);
      expect(hasPermission(permissions, 'delete_everything')).toBe(true);
    });

    it('should handle null or undefined permissions', () => {
      expect(hasPermission(null, 'view_audits')).toBe(false);
      expect(hasPermission(undefined, 'view_audits')).toBe(false);
    });

    it('should handle non-array permissions', () => {
      expect(hasPermission('not-an-array', 'view_audits')).toBe(false);
      expect(hasPermission({}, 'view_audits')).toBe(false);
    });

    it('should handle empty permissions array', () => {
      expect(hasPermission([], 'view_audits')).toBe(false);
    });

    describe('Permission Mappings', () => {
      it('should grant display_templates with view_templates', () => {
        const permissions = ['view_templates'];
        expect(hasPermission(permissions, 'display_templates')).toBe(true);
      });

      it('should grant display_templates with manage_templates', () => {
        const permissions = ['manage_templates'];
        expect(hasPermission(permissions, 'display_templates')).toBe(true);
      });

      it('should grant edit_templates with manage_templates', () => {
        const permissions = ['manage_templates'];
        expect(hasPermission(permissions, 'edit_templates')).toBe(true);
      });

      it('should grant edit_templates with update_templates', () => {
        const permissions = ['update_templates'];
        expect(hasPermission(permissions, 'edit_templates')).toBe(true);
      });

      it('should grant edit_templates with create_templates', () => {
        const permissions = ['create_templates'];
        expect(hasPermission(permissions, 'edit_templates')).toBe(true);
      });

      it('should grant delete_templates with manage_templates', () => {
        const permissions = ['manage_templates'];
        expect(hasPermission(permissions, 'delete_templates')).toBe(true);
      });

      it('should grant start_scheduled_audits with manage_scheduled_audits', () => {
        const permissions = ['manage_scheduled_audits'];
        expect(hasPermission(permissions, 'start_scheduled_audits')).toBe(true);
      });
    });

    describe('Parent Permission Inheritance', () => {
      it('should grant multi-part permissions from shorter parent', () => {
        const permissions = ['view'];
        // 'view' grants 'view_audits', 'view_templates', etc.
        expect(hasPermission(permissions, 'view_audits')).toBe(true);
        expect(hasPermission(permissions, 'view_templates')).toBe(true);
        expect(hasPermission(permissions, 'view_reports')).toBe(true);
      });

      it('should grant three-part permissions from two-part parent', () => {
        const permissions = ['view_audits'];
        // 'view_audits' grants 'view_audits_history'
        expect(hasPermission(permissions, 'view_audits_history')).toBe(true);
        expect(hasPermission(permissions, 'view_audits_details')).toBe(true);
      });

      it('should not grant unrelated permissions', () => {
        const permissions = ['view'];
        expect(hasPermission(permissions, 'create_audits')).toBe(false);
        expect(hasPermission(permissions, 'delete_templates')).toBe(false);
      });

      it('should not grant permissions with different action', () => {
        const permissions = ['view_audits'];
        expect(hasPermission(permissions, 'create_audits')).toBe(false);
        expect(hasPermission(permissions, 'delete_audits')).toBe(false);
      });
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has any of the required permissions', () => {
      const permissions = ['view_audits', 'create_audits'];
      expect(hasAnyPermission(permissions, 'view_audits', 'delete_audits')).toBe(true);
    });

    it('should return true if user has at least one permission', () => {
      const permissions = ['create_audits'];
      expect(hasAnyPermission(permissions, 'view_audits', 'create_audits', 'delete_audits')).toBe(true);
    });

    it('should return false if user has none of the required permissions', () => {
      const permissions = ['view_audits'];
      expect(hasAnyPermission(permissions, 'create_audits', 'delete_audits')).toBe(false);
    });

    it('should handle single permission check', () => {
      const permissions = ['view_audits'];
      expect(hasAnyPermission(permissions, 'view_audits')).toBe(true);
      expect(hasAnyPermission(permissions, 'delete_audits')).toBe(false);
    });

    it('should work with wildcard permissions', () => {
      const permissions = ['*'];
      expect(hasAnyPermission(permissions, 'any_permission', 'another_permission')).toBe(true);
    });

    it('should handle empty permissions', () => {
      expect(hasAnyPermission([], 'view_audits', 'create_audits')).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all required permissions', () => {
      const permissions = ['view_audits', 'create_audits', 'delete_audits'];
      expect(hasAllPermissions(permissions, 'view_audits', 'create_audits')).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      const permissions = ['view_audits', 'create_audits'];
      expect(hasAllPermissions(permissions, 'view_audits', 'create_audits', 'delete_audits')).toBe(false);
    });

    it('should return true for single permission check', () => {
      const permissions = ['view_audits'];
      expect(hasAllPermissions(permissions, 'view_audits')).toBe(true);
    });

    it('should work with wildcard permissions', () => {
      const permissions = ['*'];
      expect(hasAllPermissions(permissions, 'any_permission', 'another_permission')).toBe(true);
    });

    it('should work with parent permissions', () => {
      const permissions = ['view', 'create'];
      // 'view' grants 'view_audits', 'create' grants 'create_audits'
      expect(hasAllPermissions(permissions, 'view_audits', 'create_audits')).toBe(true);
    });

    it('should handle empty permissions', () => {
      expect(hasAllPermissions([], 'view_audits')).toBe(false);
    });

    it('should return true when no permissions required', () => {
      const permissions = ['view_audits'];
      expect(hasAllPermissions(permissions)).toBe(true);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      const user = { role: 'admin' };
      expect(isAdmin(user)).toBe(true);
    });

    it('should return true for superadmin role', () => {
      const user = { role: 'superadmin' };
      expect(isAdmin(user)).toBe(true);
    });

    it('should be case insensitive for admin', () => {
      expect(isAdmin({ role: 'Admin' })).toBe(true);
      expect(isAdmin({ role: 'ADMIN' })).toBe(true);
      expect(isAdmin({ role: 'SuperAdmin' })).toBe(true);
      expect(isAdmin({ role: 'SUPERADMIN' })).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      expect(isAdmin({ role: 'user' })).toBe(false);
      expect(isAdmin({ role: 'auditor' })).toBe(false);
      expect(isAdmin({ role: 'manager' })).toBe(false);
    });

    it('should return false for null user', () => {
      expect(isAdmin(null)).toBe(false);
    });

    it('should return false for user without role', () => {
      expect(isAdmin({})).toBe(false);
      expect(isAdmin({ name: 'John' })).toBe(false);
    });

    it('should return false for undefined user', () => {
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true for matching role', () => {
      const user = { role: 'auditor' };
      expect(hasRole(user, 'auditor')).toBe(true);
    });

    it('should be case insensitive', () => {
      const user = { role: 'Auditor' };
      expect(hasRole(user, 'auditor')).toBe(true);
      expect(hasRole(user, 'AUDITOR')).toBe(true);
      expect(hasRole(user, 'AuDiToR')).toBe(true);
    });

    it('should return false for non-matching role', () => {
      const user = { role: 'auditor' };
      expect(hasRole(user, 'admin')).toBe(false);
      expect(hasRole(user, 'manager')).toBe(false);
    });

    it('should return false for null user', () => {
      expect(hasRole(null, 'auditor')).toBe(false);
    });

    it('should return false for user without role', () => {
      expect(hasRole({}, 'auditor')).toBe(false);
      expect(hasRole({ name: 'John' }, 'auditor')).toBe(false);
    });

    it('should return false for undefined user', () => {
      expect(hasRole(undefined, 'auditor')).toBe(false);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle typical auditor permissions', () => {
      const auditorPermissions = [
        'view_audits',
        'create_audits',
        'update_audits',
        'view_templates',
      ];

      expect(hasPermission(auditorPermissions, 'view_audits')).toBe(true);
      expect(hasPermission(auditorPermissions, 'create_audits')).toBe(true);
      expect(hasPermission(auditorPermissions, 'display_templates')).toBe(true); // Mapped
      expect(hasPermission(auditorPermissions, 'delete_audits')).toBe(false);
    });

    it('should handle manager permissions', () => {
      const managerPermissions = ['view', 'create', 'update', 'delete', 'view_templates', 'view_reports'];

      // Parent 'view' grants specific view permissions
      expect(hasPermission(managerPermissions, 'view_audits')).toBe(true);
      expect(hasPermission(managerPermissions, 'create_audits')).toBe(true);
      expect(hasPermission(managerPermissions, 'delete_audits')).toBe(true);
      expect(hasPermission(managerPermissions, 'display_templates')).toBe(true); // Mapped from 'view_templates'
      expect(hasPermission(managerPermissions, 'edit_templates')).toBe(false); // Would need 'manage_templates'
    });

    it('should handle admin with wildcard', () => {
      const adminPermissions = ['*'];

      expect(hasPermission(adminPermissions, 'view_audits')).toBe(true);
      expect(hasPermission(adminPermissions, 'delete_everything')).toBe(true);
      expect(hasPermission(adminPermissions, 'any_custom_permission')).toBe(true);
    });

    it('should validate complex permission requirements', () => {
      const userPermissions = ['view_audits', 'create_audits', 'view_templates'];

      // Needs view and create
      expect(hasAllPermissions(
        userPermissions,
        'view_audits',
        'create_audits'
      )).toBe(true);

      // Needs view or delete (has view)
      expect(hasAnyPermission(
        userPermissions,
        'view_audits',
        'delete_audits'
      )).toBe(true);

      // Missing update permission
      expect(hasAllPermissions(
        userPermissions,
        'view_audits',
        'update_audits'
      )).toBe(false);
    });
  });
});
