# Auto Category Navigation Fix - Continue Audit Issue

## Problem Description

Users reported that after completing categories 2-3 in an audit and submitting, when they click "Continue Audit", the form would repeat showing the same categories (3-4) instead of moving to the next uncompleted category.

**Flow that reproduced the issue:**
1. Start audit with multiple categories (DETAILS, QUALITY, SERVICE)
2. Complete categories 2-3 (QUALITY, SERVICE) multiple times
3. Submit the audit
4. Click "Continue Audit"
5. Expected: Show next uncompleted category
6. Actual: Repeat shows categories 3-4 again

## Root Cause

When an audit is submitted, the backend clears the `audit_category` field by setting it to `null` (to allow multi-category audits). When the user clicks "Continue Audit" and the form reloads:

1. The code tried to restore to the previous `audit.audit_category` (which is now `null`)
2. Without an explicit category to select, the form didn't auto-navigate to incomplete categories
3. Users would see the form starting from an earlier category state or not properly filtered

## Solution

Implemented **smart auto-category selection** logic for both mobile and web versions:

### Mobile (`mobile/src/screens/AuditFormScreen.js`)

When loading an audit for continuation:
1. Calculate completion status for each category (by counting items with marks/status)
2. Identify incomplete categories (those not 100% complete)
3. **Auto-select the first incomplete category** automatically
4. Filter items to show only that category

**Key changes:**
- Added logic to detect if this is a continuing audit (`auditId || currentAuditId`)
- Added category completion status calculation
- Smart selection: first incomplete category → first category (if all complete) → previous category

### Web (`web/src/pages/AuditForm.js`)

Applied same logic:
1. Build category completion status from audit items
2. Filter incomplete categories
3. **Auto-select first incomplete category** for multi-category audits
4. Set activeStep to 1 to show category tabs with proper selection

## Files Modified

1. **`mobile/src/screens/AuditFormScreen.js`** (Lines ~615-685)
   - Added category completion status calculation
   - Implemented smart auto-selection logic for continuing audits
   - Added console logging for debugging

2. **`web/src/pages/AuditForm.js`** (Lines ~310-365)
   - Added category completion status calculation
   - Implemented smart auto-selection logic for continuing audits
   - Added console logging for debugging

## Flow After Fix

1. User completes categories 2-3 and submits
2. User clicks "Continue Audit"
3. Form loads and identifies that categories 2-3 are complete
4. **Auto-selects the next incomplete category (e.g., SERVICE)**
5. Form displays only items from the incomplete category
6. User can continue work smoothly without repetition

## Benefits

- **Smoother UX**: No more seeing already-completed categories when continuing
- **Automatic Navigation**: Users don't need to manually select which category to work on
- **Intuitive Behavior**: System automatically guides to the next incomplete work
- **Multi-Category Support**: Works correctly with any number of categories

## Testing

### Mobile Testing
1. Create audit with 3+ categories
2. Complete categories 1-2 fully
3. Submit
4. Click "Continue Audit"
5. ✅ Should auto-select category 3 with its items displayed

### Web Testing
1. Create audit with 3+ categories
2. Complete categories 1-2 fully
3. Submit
4. Click "Continue Audit"
5. ✅ Should auto-select category 3 in the tabs with its items displayed

## Edge Cases Handled

- ✅ Single category: Auto-selects the one category
- ✅ All categories complete: Shows first category (quick completion path)
- ✅ New audit: Works with existing category assignment logic
- ✅ No categories: Shows all items as before
- ✅ Multiple incomplete categories: Selects the first one in order

## Rollback Plan

If any issues are detected, revert the changes:
- Mobile: Revert to lines 615-645 to original logic
- Web: Revert to lines 310-340 to original logic

Both versions have detailed comments explaining the fix for future maintenance.
