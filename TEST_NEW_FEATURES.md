# Testing Guide for New Features

This document outlines how to test the newly implemented features.

## Features to Test

1. ✅ **Checklist assignment user-wise** - Already verified in code
2. ✅ **Individual checklist rescheduling** (2 times per checklist, not per-user)
3. ✅ **Backdated and future dates for rescheduling**
4. ✅ **Scheduled audits open only on scheduled date**
5. ⚠️ **Outlet capture per day limitation** - Needs investigation
6. ✅ **Schedule Adherence in dashboard**

## Quick Test Script

Run the automated test script:

```bash
cd backend
node tests/test-new-features.js
```

Or with custom token:

```bash
AUTH_TOKEN=your_token_here node backend/tests/test-new-features.js
```

## Manual Testing Steps

### 1. Individual Checklist Rescheduling

**Steps:**
1. Login as admin/manager
2. Navigate to Scheduled Audits
3. Create a new scheduled audit
4. Try to reschedule it:
   - First reschedule should succeed
   - Second reschedule should succeed
   - Third reschedule should fail with message: "This checklist has already been rescheduled 2 times"

**Expected:**
- ✅ Each checklist can be rescheduled up to 2 times individually
- ✅ Different checklists have independent reschedule counts
- ✅ Error message clearly indicates per-checklist limit

### 2. Backdated and Future Dates

**Steps:**
1. Create a scheduled audit for a future date
2. Try to reschedule it to:
   - A past date (should work)
   - A future date (should work)
   - Any date (should work)

**Expected:**
- ✅ No restriction on past dates
- ✅ No restriction on future dates
- ✅ Date picker allows any date selection

### 3. Same-Day Validation for Opening Audits

**Steps:**
1. Create a scheduled audit for tomorrow
2. Try to start the audit today
3. Should see error: "This audit is scheduled for [date]. Scheduled audits can only be opened on the scheduled date."
4. Reschedule the audit to today
5. Try to start the audit again
6. Should succeed

**Expected:**
- ✅ Cannot open scheduled audit before scheduled date
- ✅ Cannot open scheduled audit after scheduled date
- ✅ Can only open on the exact scheduled date
- ✅ Error message is clear and helpful

### 4. Schedule Adherence Dashboard

**Steps:**
1. Login and navigate to Dashboard
2. Look for "Schedule Adherence" card
3. Verify it shows:
   - Percentage of audits completed on time
   - Count of on-time completions vs total scheduled audits

**Expected:**
- ✅ Schedule Adherence card is visible (if user has permission)
- ✅ Shows percentage (0-100%)
- ✅ Shows "X of Y on time" count
- ✅ Progress bar reflects percentage

### 5. Checklist Assignment User-Wise

**Steps:**
1. Login as admin
2. Navigate to Checklists/Templates
3. Select a checklist
4. Assign it to a specific user
5. Login as that user
6. Verify they can see/use the assigned checklist
7. Login as another user
8. Verify they cannot see/use the checklist (if not assigned)

**Expected:**
- ✅ Checklists can be assigned to specific users
- ✅ Users can only use assigned checklists
- ✅ Assignment is enforced in API

### 6. Outlet Capture Per Day (Needs Investigation)

**Status:** ⚠️ Could not find explicit restriction in codebase

**Action Required:**
- Please identify where this limitation exists
- Check if it's in:
  - Audit creation logic
  - Location selection
  - Database constraints
  - UI validation

**To Test (once identified):**
1. Create an audit for a location on a specific day
2. Try to create another audit for the same location on the same day
3. Verify if restriction exists and works correctly

## API Endpoint Tests

### Test Reschedule Count (Per Checklist)

```bash
# Get reschedule count for a specific checklist
curl -X GET "http://localhost:5000/api/scheduled-audits/reschedule-count?scheduled_audit_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "rescheduleCount": 0,
  "limit": 2,
  "remainingReschedules": 2,
  "count": 0,
  "remaining": 2
}
```

### Test Reschedule (Backdated Date)

```bash
# Reschedule to a past date
curl -X POST "http://localhost:5000/api/scheduled-audits/1/reschedule" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_date": "2024-01-01"}'
```

**Expected:** Should succeed (no past date restriction)

### Test Start Scheduled Audit (Same Day Only)

```bash
# Try to start audit before scheduled date (should fail)
curl -X POST "http://localhost:5000/api/audits" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": 1,
    "restaurant_name": "Test",
    "scheduled_audit_id": 1
  }'
```

**Expected:** 
- If scheduled date is not today: 400 error with message
- If scheduled date is today: Success

### Test Schedule Adherence

```bash
# Get dashboard analytics
curl -X GET "http://localhost:5000/api/analytics/dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "scheduleAdherence": {
    "total": 10,
    "onTime": 8,
    "adherence": 80
  },
  ...
}
```

## Database Verification

### Check Reschedule Tracking

```sql
-- Check reschedules per checklist
SELECT scheduled_audit_id, COUNT(*) as reschedule_count
FROM reschedule_tracking
GROUP BY scheduled_audit_id;

-- Verify per-checklist tracking (not per-user)
SELECT scheduled_audit_id, user_id, old_date, new_date
FROM reschedule_tracking
ORDER BY scheduled_audit_id, created_at;
```

### Check Schedule Adherence Data

```sql
-- Check scheduled audits and their completion dates
SELECT 
  sa.id,
  sa.scheduled_date,
  a.completed_at,
  CASE 
    WHEN DATE(sa.scheduled_date) = DATE(a.completed_at) THEN 'On Time'
    ELSE 'Late'
  END as adherence_status
FROM scheduled_audits sa
LEFT JOIN audits a ON sa.id = a.scheduled_audit_id
WHERE a.status = 'completed';
```

## Mobile App Testing

### Reschedule in Mobile App

1. Open mobile app
2. Navigate to Scheduled Audits
3. Tap on a scheduled audit
4. Tap "Reschedule"
5. Verify:
   - Date picker allows any date (past or future)
   - Shows reschedule count for that specific checklist
   - Limits to 2 reschedules per checklist

### Start Scheduled Audit in Mobile

1. Open mobile app
2. Navigate to Scheduled Audits
3. Find an audit scheduled for today
4. Tap "Start Audit"
5. Should succeed

6. Find an audit scheduled for tomorrow
7. Tap "Start Audit"
8. Should show error about same-day requirement

## Troubleshooting

### Tests Failing

1. **Backend server not running:**
   ```bash
   cd backend
   npm start
   ```

2. **Database not initialized:**
   - Check if tables exist
   - Run migrations if needed

3. **Authentication issues:**
   - Verify JWT token is valid
   - Check user permissions

4. **Reschedule count not updating:**
   - Check `reschedule_tracking` table exists
   - Verify database type (SQLite/MySQL/MSSQL)

### Common Issues

**Issue:** Reschedule count always returns 0
- **Solution:** Check if `scheduled_audit_id` parameter is being passed correctly

**Issue:** Schedule Adherence shows 0%
- **Solution:** Verify scheduled audits have been completed
- **Solution:** Check date comparison logic (timezone issues)

**Issue:** Cannot reschedule to past date
- **Solution:** Verify backend code changes were applied
- **Solution:** Restart backend server

## Test Results Template

```
Test Date: ___________
Tester: ___________

Feature 1: Individual Checklist Rescheduling
- [ ] First reschedule works
- [ ] Second reschedule works
- [ ] Third reschedule fails correctly
- [ ] Different checklists have independent counts

Feature 2: Backdated/Future Dates
- [ ] Can reschedule to past date
- [ ] Can reschedule to future date
- [ ] Date picker allows any date

Feature 3: Same-Day Validation
- [ ] Cannot open before scheduled date
- [ ] Cannot open after scheduled date
- [ ] Can open on scheduled date
- [ ] Error message is clear

Feature 4: Schedule Adherence
- [ ] Card appears on dashboard
- [ ] Percentage is correct
- [ ] Count is accurate

Feature 5: Checklist Assignment
- [ ] Can assign checklist to user
- [ ] User can use assigned checklist
- [ ] Other users cannot use unassigned checklist

Feature 6: Outlet Per Day
- [ ] [Status: Needs investigation]
```

