# ✅ Multi-Level Escalation Paths

**Date:** 2025-01-28
**Status:** ✅ Implemented

---

## 🎯 What Was Implemented

### Configurable Multi-Level Escalation System

A flexible escalation system that allows administrators to define custom escalation paths with multiple levels. Action items automatically escalate through these levels when overdue.

**Features:**
- ✅ Create custom escalation paths (e.g., "Standard", "Critical", "High Priority")
- ✅ Define multiple levels per path (Level 1, Level 2, Level 3, etc.)
- ✅ Configure role for each level (supervisor, manager, admin, director, etc.)
- ✅ Set days before escalation for each level
- ✅ Full CRUD UI for managing escalation paths
- ✅ Automatic escalation through configured levels
- ✅ Escalation level tracking in action items

---

## 📊 How It Works

### Escalation Flow

1. **Action Item Created**: Assigned to initial user (based on assignment rules)
2. **Overdue Detection**: Job checks for overdue items daily
3. **Level 1 Escalation**: After X days, escalates to Level 1 role
4. **Level 2 Escalation**: If still overdue, escalates to Level 2 role
5. **Level 3 Escalation**: If still overdue, escalates to Level 3 role
6. **And so on...**: Continues through all configured levels

### Example Path

**"Standard" Escalation Path:**
- **Level 1**: Supervisor (after 3 days overdue)
- **Level 2**: Manager (after 7 days overdue)
- **Level 3**: Admin (after 14 days overdue)

**Flow:**
1. Day 0: Action item assigned to User A
2. Day 3: Escalated to Supervisor (Level 1)
3. Day 7: Escalated to Manager (Level 2)
4. Day 14: Escalated to Admin (Level 3)

---

## 🖥️ UI Features

### Escalation Paths Configuration

**Location:** Settings → Escalation Paths (Admin/Manager only)

**Features:**
- View all configured escalation paths (grouped by name)
- See all levels for each path
- Add new levels to existing paths
- Create new escalation paths
- Edit level configuration (role, days, etc.)
- Delete individual levels or entire paths
- Visual indicators for active/inactive paths

### Add/Edit Dialog

When adding or editing an escalation level:
1. **Path Name** - Name of the escalation path (e.g., "Standard", "Critical")
2. **Level** - Escalation level number (1, 2, 3, etc.)
3. **Role** - Role to escalate to (supervisor, manager, admin, director, etc.)
4. **Days Before Escalation** - How many days overdue before escalating to this level

---

## 🔧 Technical Details

### Database Schema

**escalation_paths table:**
```sql
CREATE TABLE escalation_paths (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,              -- Path name (e.g., "Standard")
  level INTEGER NOT NULL,          -- Escalation level (1, 2, 3, ...)
  role TEXT NOT NULL,              -- Role to escalate to
  days_before_escalation INTEGER,  -- Days overdue before this level
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME,
  updated_at DATETIME
);
```

**action_items table:**
- Added `escalation_level` column to track current escalation level (0 = not escalated, 1+ = escalated level)

### API Endpoints

**Get all paths:**
```
GET /api/escalation-paths
Returns: { paths: [...], grouped: { "Standard": [...] } }
```

**Get path by name:**
```
GET /api/escalation-paths/:name
Returns: { paths: [...] }
```

**Create level:**
```
POST /api/escalation-paths
Body: { name, level, role, days_before_escalation }
```

**Update level:**
```
PUT /api/escalation-paths/:id
Body: { name, level, role, days_before_escalation, is_active }
```

**Delete level:**
```
DELETE /api/escalation-paths/:id
```

**Delete entire path:**
```
DELETE /api/escalation-paths/name/:name
```

### Backend Logic

**File:** `backend/utils/escalationWorkflows.js`

1. **getEscalationTargetFromPath**: Finds next level in configured path
2. **findUserByRole**: Finds user with specified role (optionally filtered by location)
3. **getEscalationTarget**: Uses configured paths if available, falls back to default logic
4. **escalateActionItem**: Updates action item with new escalation level

**Escalation Process:**
1. Check current `escalation_level` of action item
2. Find configured path (default: "Standard")
3. Get next level (current_level + 1)
4. Find user with role specified in that level
5. Update action item: `escalation_level++`, assign to new user

---

## 📝 Default Configuration

The migration script creates a default "Standard" path:

- **Level 1**: Supervisor (3 days)
- **Level 2**: Manager (7 days)
- **Level 3**: Admin (14 days)

**To run migration:**
```bash
node backend/migrations/populate-escalation-paths.js
```

---

## 🚀 Usage Examples

### Example 1: Standard Escalation

**Path:** "Standard"
- Level 1: supervisor (3 days)
- Level 2: manager (7 days)
- Level 3: admin (14 days)

**Result:** Action items escalate: User → Supervisor → Manager → Admin

### Example 2: Critical Items Escalation

**Path:** "Critical"
- Level 1: manager (1 day)
- Level 2: admin (3 days)
- Level 3: director (7 days)

**Result:** Critical items escalate faster: User → Manager → Admin → Director

### Example 3: Custom Path

**Path:** "High Priority"
- Level 1: supervisor (2 days)
- Level 2: manager (5 days)

**Result:** High priority items escalate: User → Supervisor → Manager

---

## ✅ Benefits

1. **Flexibility**: Create different escalation paths for different scenarios
2. **Granular Control**: Configure each level independently
3. **Automatic**: No manual intervention needed
4. **Trackable**: See which level an action item is at
5. **Configurable**: Change paths without code changes
6. **Backward Compatible**: Falls back to default logic if no paths configured

---

## 🔄 Future Enhancements

1. **Path Selection**: Allow selecting different paths per category or template
2. **Conditional Escalation**: Escalate based on item criticality or category
3. **Escalation Analytics**: Track escalation frequency and patterns
4. **Email Notifications**: Send emails at each escalation level
5. **Escalation History**: Detailed timeline of escalations

---

## ✅ Summary

- ✅ Database table for escalation paths (all DB types)
- ✅ API endpoints for CRUD operations
- ✅ Updated escalation workflow to use configured paths
- ✅ UI for managing escalation paths
- ✅ Migration script for default path
- ✅ Escalation level tracking in action items
- ✅ Support for multiple paths and levels
- ✅ Backward compatible fallback logic

**You can now create, edit, and manage escalation paths through the Settings UI!**
