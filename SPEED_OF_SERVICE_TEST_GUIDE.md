# 🧪 Speed of Service Features - Test Guide

## 🎯 Testing URL
**URL:** `http://localhost:3000/audit/new/15?scheduled_id=1031&location_id=142`

## ✅ What to Verify

### 1. **Page Loads Successfully**
- ✅ Page should load without errors
- ✅ Template "CVR - CDR" should be displayed
- ✅ Location should be pre-selected (from `location_id=142`)

### 2. **Navigate to Speed of Service Category**
- ✅ Select "SERVICE (Speed of Service)" category
- ✅ Should see sections: `Trnx-1`, `Trnx-2`, `Trnx-3`, `Trnx-4`, `Avg`

### 3. **Section Display**
For each section (Trnx-1, Trnx-2, etc.):
- ✅ Section header shows section name
- ✅ Section header shows completion count (X/Y items)
- ✅ Section is collapsible (click to expand/collapse)
- ✅ "Collapse Section" button works
- ✅ "Add New Item" button is visible

### 4. **Time/Sec Pair Grouping**
Within each section:
- ✅ Items with `(Time)` and `(Sec)` are grouped together
- ✅ Each pair shows:
  - Base event name (e.g., "Greeted (No Queue)")
  - Time field on left (with Date icon)
  - Sec field on right (with Number icon)
- ✅ Drag handle icon visible on left
- ✅ Options menu (three dots) visible on right

### 5. **Input Fields**
- ✅ **Time fields** (`(Time)`):
  - Shows Date icon
  - Input type: `datetime-local`
  - Can select date and time
  
- ✅ **Sec fields** (`(Sec)`):
  - Shows Number icon (01. Number)
  - Input type: `number`
  - Can enter numeric value

- ✅ **Table no.**:
  - Shows Number icon
  - Input type: `number`
  - Can enter table number

### 6. **Standalone Items**
- ✅ Items without Time/Sec pairs render normally
- ✅ Full card layout with all standard features

## 🔍 Expected Items in Each Section

### Trnx-1, Trnx-2, Trnx-3, Trnx-4:
1. Table no. (Number)
2. Greeted (No Queue) (Time) + (Sec)
3. Greeted (with Queue) (Time) + (Sec)
4. Order taker approached (Time) + (Sec)
5. Order taking time (Time) + (Sec)
6. Straight Drinks served (Time) + (Sec)
7. Cocktails / Mocktails served (Time) + (Sec)
8. Starters served (Time) + (Sec)
9. Main Course served (no starters) (Time) + (Sec)
10. Main Course served (after starters) (Time) + (Sec)
11. Captain / F&B Exe. follow-up after starter (Time) + (Sec)
12. Manager follow-up after mains (Time) + (Sec)
13. Dishes cleared (Time) + (Sec)
14. Bill presented (Time) + (Sec)
15. Receipt & change given (Time) + (Sec)
16. Tables cleared, cleaned & set back (Time) + (Sec)

### Avg Section:
1. Table no. (Number)
2. Greeted (with Queue) (Sec)
3. Greeted (No Queue) (Sec)
4. Order taker approached (Sec)

## 🐛 Common Issues to Check

### Issue 1: Sections Not Showing
- **Check:** Are items created with `section` field?
- **Fix:** Run backend endpoint to create items:
  ```bash
  POST /api/templates/admin/update-speed-of-service
  {
    "templateName": "CVR - CDR",
    "category": "SERVICE (Speed of Service)"
  }
  ```

### Issue 2: Time/Sec Not Grouped
- **Check:** Do item titles include `(Time)` and `(Sec)`?
- **Check:** Are items in the same section?
- **Fix:** Verify item titles match the pattern

### Issue 3: Input Fields Not Showing
- **Check:** Is `input_type` set correctly in database?
- **Check:** Should be `'date'` for Time, `'number'` for Sec
- **Fix:** Verify database has correct `input_type` values

### Issue 4: Section Controls Not Working
- **Check:** Console for JavaScript errors
- **Check:** Are buttons clickable?
- **Fix:** Verify React state updates correctly

## 📝 Test Checklist

- [ ] Page loads at URL
- [ ] Template loads correctly
- [ ] Can navigate to "SERVICE (Speed of Service)" category
- [ ] Sections (Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg) are visible
- [ ] Sections are collapsible
- [ ] "Collapse Section" button works
- [ ] "Add New Item" button is visible
- [ ] Time/Sec pairs are grouped together
- [ ] Drag handles are visible
- [ ] Options menus (three dots) are visible
- [ ] Time fields show Date icon and datetime-local input
- [ ] Sec fields show Number icon and number input
- [ ] Can enter values in Time fields
- [ ] Can enter values in Sec fields
- [ ] Values save correctly when submitting

## 🚀 Quick Test Steps

1. **Start Backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Start Web App:**
   ```bash
   cd web
   npm start
   ```

3. **Open Browser:**
   - Navigate to: `http://localhost:3000/audit/new/15?scheduled_id=1031&location_id=142`
   - Login if required
   - Navigate to "SERVICE (Speed of Service)" category
   - Verify sections and Time/Sec pairs

4. **Test Inputs:**
   - Enter a date/time in a Time field
   - Enter a number in a Sec field
   - Save the audit
   - Verify data persists

---

**Status:** Ready for testing! 🎉
