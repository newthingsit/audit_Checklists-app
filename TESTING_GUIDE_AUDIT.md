# 📋 Comprehensive Audit Testing Guide

**Date:** December 30, 2025  
**Status:** Testing in Progress

---

## 🎯 Testing Objectives

Verify that audit functionality works correctly on both **Mobile App** and **Web App** after recent fixes:
1. ✅ Info picture upload fix
2. ✅ Templates API fix
3. ✅ Input type rendering fixes
4. ✅ Completed audit read-only mode

---

## 📱 Mobile App Testing

### Test 1: Info Picture Upload (CRITICAL - Recent Fix)

**Steps:**
1. Open mobile app in Expo Go
2. Start a new audit (or continue existing)
3. Navigate to **Info Step** (first step)
4. Fill in:
   - ✅ Select a store/location
   - ✅ Enter attendees name
   - ✅ Enter points discussed
5. **Add Pictures:**
   - Click "Add Picture" button
   - Select 2-3 pictures from gallery or take photos
   - Verify pictures appear as thumbnails
6. Click **"Next"** or **"Submit"** button
7. **Expected Result:**
   - ✅ Pictures upload successfully (no "Network request failed" errors)
   - ✅ Progress indicator shows during upload
   - ✅ Successfully proceeds to next step
   - ✅ No error alerts

**If FAILS:**
- Check terminal logs for error messages
- Verify network connection
- Check if pictures are `file://` URIs

---

### Test 2: Complete Audit Flow (Mobile)

**Steps:**
1. Start new audit from scheduled audits or templates
2. **Step 1 - Info:**
   - Select store ✅
   - Enter attendees ✅
   - Enter points discussed ✅
   - Add 2-3 pictures ✅
   - Click "Next"
3. **Step 2 - Category Selection (if multiple categories):**
   - Select a category
   - Verify items filter correctly
   - Click "Next"
4. **Step 3 - Checklist:**
   - Complete items:
     - Option select items (radio buttons)
     - Number input items
     - Date input items
     - Open-ended text items
     - Photo upload items
   - Add comments where needed
   - Upload photos for items requiring photos
5. **Submit Audit:**
   - Click "Submit" or "Save"
   - Verify success message
   - Verify redirect to audit detail screen

**Expected Results:**
- ✅ All steps complete without errors
- ✅ All data saved correctly
- ✅ Photos upload successfully
- ✅ Audit appears in audit history

---

### Test 3: View Completed Audit (Mobile)

**Steps:**
1. Open an audit that is marked as "completed"
2. Navigate through all steps:
   - Info step
   - Category selection (if applicable)
   - Checklist items
3. **Expected Results:**
   - ✅ All fields are read-only (disabled)
   - ✅ Cannot edit any data
   - ✅ Cannot add/remove pictures
   - ✅ Cannot change responses
   - ✅ "Completed" banner visible
   - ✅ Can navigate between steps to view data

---

### Test 4: Edit Incomplete Audit (Mobile)

**Steps:**
1. Open an audit that is NOT completed
2. Make changes:
   - Change responses
   - Add/remove pictures
   - Update comments
3. Save changes
4. **Expected Results:**
   - ✅ Changes save successfully
   - ✅ Updated data appears correctly
   - ✅ Can continue editing

---

## 💻 Web App Testing

### Test 5: Templates Display (CRITICAL - Recent Fix)

**Steps:**
1. Open web app in browser
2. Navigate to **Checklists** page
3. **Expected Results:**
   - ✅ Templates load and display
   - ✅ No console errors
   - ✅ Templates show:
     - Name
     - Category
     - Item count
     - Created by
   - ✅ Can filter by category
   - ✅ Can search templates

**If FAILS:**
- Open browser console (F12)
- Check for API errors
- Verify `/api/templates` endpoint returns data
- Check network tab for failed requests

---

### Test 6: Audit Form Input Types (Web)

**Steps:**
1. Start a new audit from a template
2. Navigate to checklist step
3. Test each input type:

   **a) Number Input:**
   - Find item with `input_type: "number"`
   - Enter a number
   - Verify value saves correctly

   **b) Date Input:**
   - Find item with `input_type: "date"`
   - Select date/time
   - Verify value saves correctly

   **c) Open Ended Text:**
   - Find item with `input_type: "open_ended"` or `"description"`
   - Enter text
   - Verify value saves correctly

   **d) Option Select:**
   - Find item with `input_type: "option_select"`
   - Select an option
   - Verify selection saves correctly

   **e) Task/Status:**
   - Find item with `input_type: "task"`
   - Mark as completed/failed/warning
   - Verify status saves correctly

4. Save audit
5. **Expected Results:**
   - ✅ All input types render correctly
   - ✅ Values save to database
   - ✅ Values load correctly when reopening audit

---

### Test 7: Complete Audit Flow (Web)

**Steps:**
1. Start new audit
2. **Step 1 - Store Information:**
   - Select store from dropdown
   - Add notes (optional)
   - Click "Next"
3. **Step 2 - Category Selection (if multiple):**
   - Select category
   - Verify items filter
   - Click "Next"
4. **Step 3 - Checklist:**
   - Complete all items
   - Add photos where required
   - Add comments
5. **Submit:**
   - Click "Save Audit"
   - Verify success
   - Verify redirect to audit detail

**Expected Results:**
- ✅ All steps work correctly
- ✅ Data saves properly
- ✅ No console errors
- ✅ Success message appears

---

### Test 8: View Completed Audit (Web)

**Steps:**
1. Open a completed audit
2. Navigate through all sections
3. **Expected Results:**
   - ✅ All fields disabled/read-only
   - ✅ Cannot edit any data
   - ✅ "Completed" status visible
   - ✅ Can view all data correctly

---

## 🔍 Common Issues to Check

### Mobile App Issues:
- ❌ Info pictures fail to upload → Check network, verify URI format
- ❌ App crashes → Check console logs
- ❌ Data not saving → Check API responses
- ❌ Images not loading → Check URL format, verify server paths

### Web App Issues:
- ❌ Templates not showing → Check `/api/templates` endpoint
- ❌ Input types not rendering → Check `input_type` values
- ❌ Values not saving → Check `input_value` in payload
- ❌ Console errors → Check browser console

---

## 📊 Test Results Tracking

| Test # | Test Name | Mobile | Web | Status | Notes |
|--------|-----------|--------|-----|--------|-------|
| 1 | Info Picture Upload | ⏳ | N/A | Pending | Critical fix |
| 2 | Complete Audit Flow | ⏳ | ⏳ | Pending | |
| 3 | View Completed Audit | ⏳ | ⏳ | Pending | |
| 4 | Edit Incomplete Audit | ⏳ | N/A | Pending | |
| 5 | Templates Display | N/A | ⏳ | Pending | Critical fix |
| 6 | Input Types | N/A | ⏳ | Pending | |
| 7 | Complete Audit Flow | N/A | ⏳ | Pending | |
| 8 | View Completed Audit | N/A | ⏳ | Pending | |

**Legend:**
- ✅ Passed
- ❌ Failed
- ⏳ Pending
- 🔄 In Progress

---

## 🐛 Bug Reporting Format

If you find issues, report with:
1. **Platform:** Mobile / Web
2. **Test Number:** e.g., Test 1
3. **Steps to Reproduce:** Detailed steps
4. **Expected Result:** What should happen
5. **Actual Result:** What actually happened
6. **Error Messages:** Copy exact error text
7. **Screenshots:** If applicable
8. **Console Logs:** Relevant log entries

---

## ✅ Success Criteria

All tests must pass for production readiness:
- ✅ Info pictures upload successfully on mobile
- ✅ Templates display correctly on web
- ✅ All input types work on web
- ✅ Completed audits are read-only on both platforms
- ✅ No console errors or network failures
- ✅ Data saves and loads correctly

---

**Next Steps:**
1. Run all tests systematically
2. Document any failures
3. Fix issues as they arise
4. Re-test after fixes
5. Mark tests as complete when passing
