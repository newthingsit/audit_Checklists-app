# Testing Summary for New Features

## ✅ Changes Implemented and Ready for Testing

### 1. Individual Checklist Rescheduling (2 times per checklist)
**Status:** ✅ Implemented

**Files Changed:**
- `backend/routes/scheduled-audits.js` - Changed from per-user-per-month to per-checklist tracking
- `mobile/src/screens/ScheduledAuditsScreen.js` - Updated mobile app to check per-checklist count

**How to Test:**
1. Create a scheduled audit
2. Reschedule it twice (should succeed)
3. Try to reschedule a third time (should fail with message about 2-time limit per checklist)
4. Create another scheduled audit and verify it has its own independent reschedule count

**API Test:**
```bash
# Get reschedule count for specific checklist
GET /api/scheduled-audits/reschedule-count?scheduled_audit_id=1

# Reschedule (up to 2 times)
POST /api/scheduled-audits/1/reschedule
Body: {"new_date": "2024-12-25"}
```

---

### 2. Backdated and Future Dates for Rescheduling
**Status:** ✅ Implemented

**Files Changed:**
- `backend/routes/scheduled-audits.js` - Removed past date validation
- `mobile/src/screens/ScheduledAuditsScreen.js` - Removed date restrictions in date picker

**How to Test:**
1. Create a scheduled audit
2. Reschedule it to a past date (should work)
3. Reschedule it to a future date (should work)
4. Verify date picker allows any date selection

**API Test:**
```bash
# Reschedule to past date (should work)
POST /api/scheduled-audits/1/reschedule
Body: {"new_date": "2024-01-01"}

# Reschedule to future date (should work)
POST /api/scheduled-audits/1/reschedule
Body: {"new_date": "2025-12-31"}
```

---

### 3. Scheduled Audits Open Only on Scheduled Date
**Status:** ✅ Implemented

**Files Changed:**
- `backend/routes/audits.js` - Added same-day validation
- `web/src/pages/AuditForm.js` - Added UI validation message

**How to Test:**
1. Create a scheduled audit for tomorrow
2. Try to start the audit today (should fail with error message)
3. Reschedule the audit to today
4. Try to start the audit (should succeed)
5. Create a scheduled audit for yesterday
6. Try to start it today (should fail)

**API Test:**
```bash
# Try to start audit before scheduled date (should fail)
POST /api/audits
Body: {
  "template_id": 1,
  "restaurant_name": "Test",
  "scheduled_audit_id": 1
}
# Expected: 400 error with message about scheduled date
```

---

### 4. Schedule Adherence in Dashboard
**Status:** ✅ Implemented

**Files Changed:**
- `backend/routes/analytics.js` - Added Schedule Adherence calculation
- `web/src/pages/Dashboard.js` - Added Schedule Adherence card UI

**How to Test:**
1. Login and navigate to Dashboard
2. Look for "Schedule Adherence" card (should appear if user has permission)
3. Verify it shows:
   - Percentage (0-100%)
   - "X of Y on time" count
   - Progress bar

**API Test:**
```bash
# Get dashboard analytics
GET /api/analytics/dashboard

# Response should include:
{
  "scheduleAdherence": {
    "total": 10,
    "onTime": 8,
    "adherence": 80
  }
}
```

---

### 5. Checklist Assignment User-Wise
**Status:** ✅ Already Implemented (Verified)

**Files:**
- `backend/routes/checklists.js` - Assignment endpoint exists
- `backend/routes/audits.js` - Permission check exists

**How to Test:**
1. Login as admin
2. Navigate to Checklists
3. Assign a checklist to a specific user
4. Login as that user
5. Verify they can use the assigned checklist
6. Login as another user
7. Verify they cannot use the unassigned checklist

**API Test:**
```bash
# Assign checklist to user
POST /api/checklists/1/permissions/user/2
Body: {"can_start_audit": true}

# Get checklist permissions
GET /api/checklists/1/permissions/user/2
```

---

### 6. Outlet Capture Per Day Limitation
**Status:** ⚠️ Needs Investigation

**Action Required:**
- Could not find explicit restriction in codebase
- Please identify where this limitation exists:
  - Is it in audit creation logic?
  - Is it in location selection?
  - Is it a database constraint?
  - Is it a UI validation?

**To Investigate:**
```bash
# Search for potential restrictions
grep -r "location.*day\|outlet.*day\|per.*day" backend/
grep -r "COUNT.*location.*DATE\|GROUP BY.*location.*DATE" backend/
```

---

## Test Scripts Created

### 1. Automated Test Script
**File:** `backend/tests/test-new-features.js`

**Usage:**
```bash
cd backend
node tests/test-new-features.js
```

**Note:** Requires authentication. You can either:
- Use default admin credentials (admin@example.com / admin123)
- Or set AUTH_TOKEN environment variable

### 2. Manual Testing Guide
**File:** `TEST_NEW_FEATURES.md`

Contains detailed step-by-step testing instructions for all features.

---

## Quick Verification Checklist

### Backend API Verification
- [ ] Reschedule endpoint accepts `scheduled_audit_id` parameter
- [ ] Reschedule count is per-checklist, not per-user
- [ ] No past date restriction in reschedule endpoint
- [ ] Same-day validation in audit creation endpoint
- [ ] Schedule Adherence in dashboard analytics endpoint

### Frontend UI Verification
- [ ] Schedule Adherence card appears on dashboard
- [ ] Error message shows when trying to open audit before scheduled date
- [ ] Date picker allows any date for rescheduling
- [ ] Reschedule count shows per-checklist limit

### Mobile App Verification
- [ ] Reschedule modal shows per-checklist count
- [ ] Date picker allows past and future dates
- [ ] Error message shows when trying to open audit before scheduled date

---

## Database Verification Queries

### Check Reschedule Tracking (Per Checklist)
```sql
-- Verify reschedules are tracked per checklist
SELECT 
  scheduled_audit_id,
  COUNT(*) as reschedule_count,
  GROUP_CONCAT(user_id) as users_who_rescheduled
FROM reschedule_tracking
GROUP BY scheduled_audit_id;
```

### Check Schedule Adherence Data
```sql
-- Verify scheduled audits and completion dates
SELECT 
  sa.id as scheduled_audit_id,
  sa.scheduled_date,
  a.completed_at,
  CASE 
    WHEN DATE(sa.scheduled_date) = DATE(a.completed_at) THEN 'On Time'
    ELSE 'Late'
  END as adherence_status
FROM scheduled_audits sa
LEFT JOIN audits a ON sa.id = a.scheduled_audit_id
WHERE a.status = 'completed'
ORDER BY sa.scheduled_date DESC;
```

---

## Known Issues / Notes

1. **Reschedule Count Endpoint:** Now requires `scheduled_audit_id` parameter. If not provided, returns default values (0 count, 2 limit).

2. **Schedule Adherence:** Calculation is based on scheduled_date matching completed_at date. Timezone differences might affect accuracy.

3. **Same-Day Validation:** Uses date comparison (ignores time). An audit scheduled for "2024-12-25" can only be opened on "2024-12-25" regardless of time.

4. **Mobile App:** Requires AsyncStorage import for token handling in reschedule check.

---

## Next Steps

1. ✅ Run automated test script
2. ✅ Perform manual testing using TEST_NEW_FEATURES.md
3. ⚠️ Investigate outlet per day limitation
4. ✅ Verify all changes work in production environment
5. ✅ Update documentation if needed

---

## Support

If you encounter any issues during testing:
1. Check backend server logs
2. Verify database tables exist (especially `reschedule_tracking`)
3. Check user permissions
4. Verify JWT token is valid
5. Review error messages in API responses

