# ✅ Assignment Rules & Escalation Workflows

**Date:** 2025-01-28
**Status:** ✅ Implemented and Ready for Testing

---

## 🎯 Assignment Rules System

### Overview
The assignment rules system automatically assigns action items to the most appropriate user based on:
1. **Category-based rules**: Items in specific categories (e.g., "Food Safety") are assigned to managers
2. **Location-based rules**: Items are assigned to location managers or supervisors assigned to that location
3. **Severity-based rules**: Critical items are assigned to managers/supervisors
4. **Default fallback**: If no rule matches, items are assigned to the audit creator

### Implementation Details

#### 1. Category-Based Assignment
- **Food Safety** items → `manager` role
- **Service** items → `supervisor` role
- **Cleanliness/Hygiene** items → `supervisor` or `manager` role
- Priority: Location-specific user → Any user with the role

#### 2. Location-Based Assignment
- Priority 1: Location manager (if `manager_id` column exists)
- Priority 2: User assigned to location with `manager` or `supervisor` role
- Falls back to category or severity rules if no location match

#### 3. Severity-Based Assignment
- Critical items (`is_critical = true`) → `manager` or `supervisor`
- Priority: Location-specific → Any manager/supervisor

#### 4. Default Assignment
- Falls back to audit creator if no rules match

### File: `backend/utils/assignmentRules.js`
- `getAssigneeByRules()`: Main function to determine assignee
- `evaluateCategoryRule()`: Category-based assignment logic
- `evaluateLocationRule()`: Location-based assignment logic
- `evaluateSeverityRule()`: Severity-based assignment logic
- `getDefaultAssignee()`: Fallback to audit creator

### Integration
The assignment rules are integrated into `backend/utils/autoActions.js`:
- When action items are auto-created, they use `getAssigneeByRules()` to determine the assignee
- Items are grouped by category for batch assignment
- Each category gets its own assignee based on the rules

---

## 📈 Escalation Workflows

### Overview
The escalation workflow automatically escalates overdue action items to higher-level users after a configurable number of days.

### Configuration
- **Environment Variable**: `ESCALATION_DAYS` (default: 3 days)
- **Scheduled Job**: Runs daily at 10:00 AM
- **Escalation Threshold**: Items overdue by `ESCALATION_DAYS` or more are escalated

### Escalation Logic

#### Escalation Target Priority
1. **Supervisor of current assignee** (if `supervisor_id` exists in users table)
2. **Manager assigned to same location** (if action item has location)
3. **Any manager** in the system
4. **Admin** (fallback)

#### What Happens on Escalation
1. Action item is updated:
   - `escalated = 1`
   - `escalated_to = [new assignee ID]`
   - `escalated_at = [current timestamp]`
   - `assigned_to = [new assignee ID]` (reassigned)

2. Escalation comment is added (if `action_comments` table exists):
   - Comment: `[AUTO-ESCALATED] Auto-escalated after X days overdue`

3. Notifications are sent:
   - To escalation target: "Action Item Escalated to You"
   - To original assignee: "Action Item Escalated"

### Database Schema Updates

#### New Columns in `action_items` Table
- `escalated` (INTEGER/BOOLEAN): Whether item has been escalated (default: 0/false)
- `escalated_to` (INTEGER): User ID of escalation target
- `escalated_at` (DATETIME/TIMESTAMP): When escalation occurred

#### Database Support
- ✅ SQLite: Added columns with ALTER TABLE statements
- ✅ MSSQL: Added columns with IF NOT EXISTS checks
- ✅ MySQL: Added columns with IF NOT EXISTS checks
- ✅ PostgreSQL: Added columns with DO block for safe addition

### Files

#### `backend/utils/escalationWorkflows.js`
- `checkAndEscalateActions()`: Main function to find and escalate overdue items
- `escalateActionItem()`: Escalates a single action item
- `getEscalationTarget()`: Determines who to escalate to
- `addEscalationComment()`: Adds escalation comment
- `sendEscalationNotifications()`: Sends notifications

#### `backend/jobs/escalation-job.js`
- `runEscalationCheck()`: Scheduled job entry point
- Runs daily at 10:00 AM (configurable via cron)

#### Integration in `backend/server.js`
- Escalation job scheduled via `node-cron`
- Runs daily at 10:00 AM
- Can be triggered on startup with `RUN_JOBS_ON_STARTUP=true`

---

## 🧪 Testing Guide

### Test Assignment Rules

1. **Category-Based Assignment**:
   - Create an audit with items in "Food Safety" category
   - Complete the audit with some failed items
   - Verify action items are assigned to a user with `manager` role

2. **Location-Based Assignment**:
   - Assign a user with `manager` role to a location
   - Create an audit for that location
   - Complete with failed items
   - Verify action items are assigned to the location manager

3. **Severity-Based Assignment**:
   - Create an audit with critical items (`is_critical = true`)
   - Complete with failed critical items
   - Verify action items are assigned to manager/supervisor

4. **Default Assignment**:
   - Create an audit with items that don't match any rules
   - Complete with failed items
   - Verify action items are assigned to audit creator

### Test Escalation Workflows

1. **Create Overdue Action Item**:
   - Manually create an action item with `due_date` set to 4+ days ago
   - Set `status = 'pending'` and `escalated = 0`

2. **Run Escalation Job**:
   ```bash
   # Set environment variable
   export ESCALATION_DAYS=3
   
   # Run job manually (or wait for scheduled run)
   node -e "require('./backend/jobs/escalation-job').runEscalationCheck()"
   ```

3. **Verify Escalation**:
   - Check that action item has `escalated = 1`
   - Check that `escalated_to` and `escalated_at` are set
   - Check that `assigned_to` is updated to escalation target
   - Verify notifications were sent

4. **Test Scheduled Job**:
   - Set `RUN_JOBS_ON_STARTUP=true` in environment
   - Restart backend server
   - Check logs for escalation job execution

---

## 🔧 Configuration

### Environment Variables

```bash
# Escalation threshold (days)
ESCALATION_DAYS=3

# Run jobs on startup (for testing)
RUN_JOBS_ON_STARTUP=true
```

### Customizing Assignment Rules

Edit `backend/utils/assignmentRules.js`:

```javascript
// Add new category mappings
const categoryRoleMap = {
  'FOOD SAFETY': 'manager',
  'YOUR_CATEGORY': 'supervisor',
  // ... add more
};
```

### Customizing Escalation Schedule

Edit `backend/server.js`:

```javascript
// Change from daily at 10 AM to twice daily
cron.schedule('0 10,14 * * *', () => {
  escalationJob.runEscalationCheck();
});
```

---

## 📊 Monitoring

### Logs to Watch

1. **Assignment Rules**:
   - `[Assignment Rules] Category rule matched: ...`
   - `[Assignment Rules] Location rule matched: ...`
   - `[Assignment Rules] Severity rule matched: ...`

2. **Escalation**:
   - `[Escalation] Found X overdue actions to escalate`
   - `[Escalation] Escalated action X "..."`
   - `[Escalation Job] Successfully escalated X action item(s)`

### Database Queries

```sql
-- Check escalated action items
SELECT ai.*, u1.name as assigned_to_name, u2.name as escalated_to_name
FROM action_items ai
LEFT JOIN users u1 ON ai.assigned_to = u1.id
LEFT JOIN users u2 ON ai.escalated_to = u2.id
WHERE ai.escalated = 1;

-- Check overdue items awaiting escalation
SELECT ai.*, 
       DATE(ai.due_date) as due_date,
       JULIANDAY('now') - JULIANDAY(ai.due_date) as days_overdue
FROM action_items ai
WHERE ai.status != 'completed'
  AND DATE(ai.due_date) < DATE('now', '-3 days')
  AND (ai.escalated = 0 OR ai.escalated IS NULL);
```

---

## 🚀 Next Steps

1. **Enhanced Assignment Rules**:
   - Add UI for configuring assignment rules
   - Support custom assignment rules per template
   - Support user-specific assignment preferences

2. **Multi-Level Escalation**:
   - Support multiple escalation levels (e.g., Supervisor → Manager → Director)
   - Configurable escalation paths per organization

3. **Escalation History**:
   - Track escalation history in separate table
   - Show escalation timeline in UI

4. **Notifications**:
   - Email notifications for escalations
   - SMS notifications for critical escalations

---

## ✅ Summary

- ✅ Assignment rules system implemented (category, location, severity-based)
- ✅ Escalation workflows implemented (auto-escalate after X days)
- ✅ Database schema updated (all database types)
- ✅ Scheduled job created and integrated
- ✅ Notifications integrated
- ✅ Comprehensive logging added
- ✅ Documentation created

Both features are production-ready and can be tested immediately.
