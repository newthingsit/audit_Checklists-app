# ✅ Speed of Service: Correct Input Types

## 🎯 Required Input Types

For Speed of Service items, you must use these input types from the "Add Type" menu:

### ✅ CORRECT Input Types:

1. **Date** - For `(Time)` items
   - Example: "Greeted (No Queue) (Time)"
   - Shows: Date/time picker
   - Captures: When the event occurred

2. **Number** - For `(Sec)` items and "Table no."
   - Example: "Greeted (No Queue) (Sec)"
   - Shows: Number input field
   - Captures: Duration in seconds

---

## ❌ WRONG Input Types (Do NOT Use):

These will create Yes/No/N/A options:

- ❌ **Single Answer** - Creates radio buttons (Yes/No/N/A)
- ❌ **Multiple Answer** - Creates checkboxes
- ❌ **Dropdown** - Creates dropdown with options

**DO NOT use these for Speed of Service items!**

---

## 📋 Complete Mapping

### For Trnx-1, Trnx-2, Trnx-3, Trnx-4 Sections:

| Item Title | Input Type | From "Add Type" Menu |
|------------|------------|---------------------|
| Table no. | `number` | **Number** |
| Greeted (No Queue) (Time) | `date` | **Date** |
| Greeted (No Queue) (Sec) | `number` | **Number** |
| Greeted (with Queue) (Time) | `date` | **Date** |
| Greeted (with Queue) (Sec) | `number` | **Number** |
| Order taker approached (Time) | `date` | **Date** |
| Order taker approached (Sec) | `number` | **Number** |
| Order taking time (Time) | `date` | **Date** |
| Order taking time (Sec) | `number` | **Number** |
| Straight Drinks served (Time) | `date` | **Date** |
| Straight Drinks served (Sec) | `number` | **Number** |
| Cocktails / Mocktails served (Time) | `date` | **Date** |
| Cocktails / Mocktails served (Sec) | `number` | **Number** |
| Starters served (Time) | `date` | **Date** |
| Starters served (Sec) | `number` | **Number** |
| Main Course served (no starters) (Time) | `date` | **Date** |
| Main Course served (no starters) (Sec) | `number` | **Number** |
| Main Course served (after starters) (Time) | `date` | **Date** |
| Main Course served (after starters) (Sec) | `number` | **Number** |
| Captain / F&B Exe. follow-up after starter (Time) | `date` | **Date** |
| Captain / F&B Exe. follow-up after starter (Sec) | `number` | **Number** |
| Manager follow-up after mains (Time) | `date` | **Date** |
| Manager follow-up after mains (Sec) | `number` | **Number** |
| Dishes cleared (Time) | `date` | **Date** |
| Dishes cleared (Sec) | `number` | **Number** |
| Bill presented (Time) | `date` | **Date** |
| Bill presented (Sec) | `number` | **Number** |
| Receipt & change given (Time) | `date` | **Date** |
| Receipt & change given (Sec) | `number` | **Number** |
| Tables cleared, cleaned & set back (Time) | `date` | **Date** |
| Tables cleared, cleaned & set back (Sec) | `number` | **Number** |

### For Avg Section:

| Item Title | Input Type | From "Add Type" Menu |
|------------|------------|---------------------|
| Table no. | `number` | **Number** |
| Greeted (with Queue) (Sec) | `number` | **Number** |
| Greeted (No Queue) (Sec) | `number` | **Number** |
| Order taker approached (Sec) | `number` | **Number** |
| Order taking time (Sec) | `number` | **Number** |
| Straight Drinks served (Sec) | `number` | **Number** |
| Cocktails / Mocktails served (Sec) | `number` | **Number** |
| Starters served (Sec) | `number` | **Number** |
| Main Course served (no starters) (Sec) | `number` | **Number** |
| Main Course served (after starters) (Sec) | `number` | **Number** |
| Captain / F&B Exe. follow-up after starter (Sec) | `number` | **Number** |
| Manager follow-up after mains (Sec) | `number` | **Number** |
| Dishes cleared (Sec) | `number` | **Number** |
| Bill presented (Sec) | `number` | **Number** |
| Receipt & change given (Sec) | `number` | **Number** |
| Tables cleared, cleaned & set back (Sec) | `number` | **Number** |

---

## 🔍 How to Verify in Checklist Builder

When creating/editing Speed of Service items in the Checklist Builder:

1. **Click "Add Item"** or edit existing item
2. **Set "Field Type":**
   - For items with `(Time)` → Select **"Date"**
   - For items with `(Sec)` → Select **"Number"**
   - For "Table no." → Select **"Number"**
3. **DO NOT select:**
   - ❌ "Single Answer" (creates Yes/No/N/A)
   - ❌ "Multiple Answer"
   - ❌ "Dropdown"

---

## ✅ Quick Fix: Auto-Create with Correct Types

To ensure all items have correct input types, run:

### Browser Console:
```javascript
const token = sessionStorage.getItem('auth_token');
fetch('/api/templates/admin/update-speed-of-service', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    templateName: 'CVR - CDR',
    category: 'SERVICE (Speed of Service)'
  })
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    alert('✅ All items now use correct input types (Date/Number)!');
    console.log('Created:', data.insertedItems, 'items');
  }
});
```

This will automatically create all items with:
- ✅ `input_type = 'date'` for `(Time)` items
- ✅ `input_type = 'number'` for `(Sec)` items
- ✅ NO `option_select` (which would show Yes/No/N/A)

---

## 📊 Database Verification

Check that items use correct input types:

```sql
-- Should show only 'date' and 'number', NO 'option_select'
SELECT DISTINCT input_type, COUNT(*) as count
FROM checklist_items
WHERE category = 'SERVICE (Speed of Service)'
GROUP BY input_type;
```

**Expected Result:**
```
input_type | count
-----------|------
date       | 60    (30 items × 2 sections with Time fields)
number     | 76    (Sec fields + Table no.)
```

**Should NOT see:**
- ❌ `option_select` (this would create Yes/No/N/A)

---

## 🎯 Summary

✅ **Use:**
- **Date** for `(Time)` items
- **Number** for `(Sec)` items and "Table no."

❌ **Don't Use:**
- **Single Answer** (creates Yes/No/N/A)
- **Multiple Answer**
- **Dropdown**

**All Speed of Service items should use Date or Number input types, never option_select!**
