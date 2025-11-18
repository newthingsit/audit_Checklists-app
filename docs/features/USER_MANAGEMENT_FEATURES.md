# User Management & Permissions System

## ✅ Features Implemented

### 1. Role-Based Access Control (RBAC)

**Roles Available:**
- **Admin** - Full access, can manage users
- **Manager** - Can manage audits and locations
- **Auditor** - Can create and view audits
- **User** - Basic access, can view own audits

**Backend Middleware:**
- `requireRole(...roles)` - Check if user has specific role(s)
- `requireAdmin` - Require admin role
- `requireAdminOrManager` - Require admin or manager role

### 2. User Management API

**Endpoints (Admin Only):**
- `GET /api/users` - Get all users (with search and role filter)
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user (name, email, role, password)
- `DELETE /api/users/:id` - Delete user

**Features:**
- Email uniqueness validation
- Password hashing with bcrypt
- Role validation
- Prevent self-deletion
- Search functionality
- Role filtering

### 3. User Management Page

**Location:** `/users` (Admin only)

**Features:**
- **User List Table:**
  - Name, Email, Role, Created Date
  - Visual role badges (color-coded)
  - Highlight current user
  - Search functionality
  - Role filter dropdown

- **Add User:**
  - Name, Email, Password, Role
  - Form validation
  - Error handling

- **Edit User:**
  - Update name, email, role
  - Optional password change
  - Form validation

- **Delete User:**
  - Confirmation dialog
  - Prevent self-deletion
  - Safe deletion

### 4. Permission System

**Frontend:**
- `AdminRoute` component - Protects admin-only routes
- Role-based menu items (Users menu only for admins)
- User role stored in auth context

**Backend:**
- Permission middleware for route protection
- Role checking in all user management routes
- JWT token includes user role

### 5. Navigation Updates

- "Users" menu item appears only for admin users
- Automatic role-based UI updates
- Clean, intuitive navigation

## 🔐 Security Features

1. **Password Security:**
   - Passwords hashed with bcrypt (10 rounds)
   - Minimum 6 characters required
   - Optional password updates (can leave blank)

2. **Access Control:**
   - Admin-only routes protected
   - Role verification on backend
   - Frontend route guards

3. **Data Validation:**
   - Email format validation
   - Role validation (only allowed roles)
   - Required field validation

4. **Safety Features:**
   - Cannot delete own account
   - Email uniqueness check
   - User ownership verification

## 📋 Usage

### For Admins:

1. **Access User Management:**
   - Click "Users" in sidebar (only visible to admins)
   - View all users in table format

2. **Add New User:**
   - Click "Add User" button
   - Fill in name, email, password, and role
   - Click "Create"

3. **Edit User:**
   - Click edit icon next to user
   - Update information
   - Leave password blank to keep current password
   - Click "Update"

4. **Delete User:**
   - Click delete icon next to user
   - Confirm deletion
   - Cannot delete yourself

5. **Search & Filter:**
   - Use search box to find users by name or email
   - Use role filter to filter by role

### For Other Users:

- User management page is not accessible
- Users menu item is hidden
- Redirected to dashboard if trying to access

## 🎨 UI Features

- **Color-Coded Roles:**
  - Admin: Red
  - Manager: Orange
  - Auditor: Blue
  - User: Gray

- **Visual Indicators:**
  - Current user highlighted
  - "You" badge on own account
  - Hover effects on table rows
  - Professional table design

- **Responsive Design:**
  - Works on all screen sizes
  - Mobile-friendly layout
  - Clean, modern interface

## 🔧 Technical Details

### Files Created:
- `backend/routes/users.js` - User management API
- `backend/middleware/permissions.js` - RBAC middleware
- `web/src/pages/UserManagement.js` - User management page
- `web/src/components/AdminRoute.js` - Admin route guard

### Files Modified:
- `backend/server.js` - Added users route
- `backend/routes/auth.js` - Include role in JWT token
- `web/src/App.js` - Added users route with AdminRoute
- `web/src/components/Layout.js` - Added Users menu (admin only)
- `web/src/context/AuthContext.js` - Role handling

### Database:
- Uses existing `users` table
- `role` column already exists
- No schema changes needed

## 🚀 Next Steps (Optional Enhancements)

1. **Permission Granularity:**
   - Fine-grained permissions (e.g., can_create_audit, can_delete_audit)
   - Permission groups
   - Custom roles

2. **User Activity Logging:**
   - Track user actions
   - Audit log for user management
   - Activity history

3. **Bulk User Operations:**
   - Bulk import users
   - Bulk role assignment
   - Bulk delete

4. **User Invitations:**
   - Email invitations
   - Invitation tokens
   - Self-registration with invitation

5. **User Profile Enhancements:**
   - Profile pictures
   - Additional user fields
   - User preferences

## 📝 API Examples

### Create User (Admin only)
```bash
POST /api/users
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "auditor"
}
```

### Update User (Admin only)
```bash
PUT /api/users/2
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "role": "manager"
  // password is optional
}
```

### Get All Users (Admin only)
```bash
GET /api/users?search=john&role=auditor
```

### Delete User (Admin only)
```bash
DELETE /api/users/2
```

## ✅ Testing Checklist

- [x] Admin can access user management
- [x] Non-admin cannot access user management
- [x] Admin can create users
- [x] Admin can edit users
- [x] Admin can delete users (except self)
- [x] Email uniqueness validation works
- [x] Password validation works
- [x] Role validation works
- [x] Search functionality works
- [x] Role filter works
- [x] UI shows correct role badges
- [x] Current user is highlighted

