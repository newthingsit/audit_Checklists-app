# Outlet Per Day Limitation Investigation

## Status: ✅ No Restriction Found

After thorough investigation of the codebase, **no explicit restriction preventing multiple audits per location per day was found**.

## Investigation Results

### Database Schema
- ✅ No UNIQUE constraint on `(location_id, DATE(created_at))` in audits table
- ✅ No database-level restriction preventing multiple audits per location per day

### Backend Code
- ✅ No validation in `backend/routes/audits.js` that checks for existing audits on the same day
- ✅ No query that prevents creating multiple audits for the same location on the same day
- ✅ Audit creation endpoint allows multiple audits per location per day

### Frontend Code
- ✅ No UI validation preventing multiple audits per location per day
- ✅ No warning messages about existing audits for the same location

## Current Behavior

**The system currently ALLOWS multiple audits per location per day.**

Users can:
- Create multiple audits for the same location on the same day
- Use different templates for the same location on the same day
- Create audits for the same location by different users on the same day

## Possible Scenarios

### If Restriction Should Be Added:
If you want to **prevent** multiple audits per location per day, we would need to add validation in:
1. `backend/routes/audits.js` - Check for existing audits before creating
2. Frontend - Show warning if audit already exists for location today

### If Restriction Should Be Removed:
If there's a **hidden restriction** somewhere (maybe in business logic or UI), we need to identify and remove it.

## Recommendation

Since you mentioned "Only one outlet is being captured per day, which needs to be reviewed", this suggests:

1. **Either:** There's a business rule that should be enforced (limit to 1 audit per location per day)
2. **Or:** There's a UI/business logic issue preventing multiple audits that needs to be fixed

## Next Steps

Please clarify:
1. **Should multiple audits per location per day be allowed?** (Current behavior)
2. **Or should it be restricted to 1 audit per location per day?** (Would require adding validation)

If you want to restrict to 1 audit per location per day, I can add:
- Backend validation to check for existing audits
- Clear error message when attempting duplicate
- Option to view existing audit instead

If you want to allow multiple audits (current behavior), the system is already configured correctly.

