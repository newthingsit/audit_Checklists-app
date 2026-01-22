# 🔧 Fix Speed of Service: Remove Yes/No/N/A Options

## 🎯 Problem

If you're seeing **Yes/No/N/A options** in Speed of Service questions, it means old items exist in the database that need to be replaced with time-based items.

---

## ✅ Solution: Replace with Time-Based Items

### Method 1: Using Browser Console (Easiest)

1. **Open your audit app** (logged in as Admin)
2. **Press F12** → **Console** tab
3. **Paste this code:**

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
    alert('✅ SUCCESS! Replaced ' + data.deletedItems + ' old items with ' + data.insertedItems + ' time-based items!');
    console.log('✅ Fixed:', data);
    setTimeout(() => {
      if (confirm('Items fixed! Refresh page to see changes?')) {
        window.location.reload();
      }
    }, 1000);
  } else {
    alert('❌ Error: ' + (data.error || data.message));
  }
})
.catch(err => {
  alert('❌ Error: ' + err.message);
  console.error(err);
});
```

4. **Press Enter**
5. **Wait for success message**
6. **Refresh the page**

---

### Method 2: Using Command Line

```bash
cd backend
node scripts/create-speed-of-service-items.js "CVR - CDR" "SERVICE (Speed of Service)"
```

---

## ✅ What Gets Fixed

### ❌ Before (Wrong - Yes/No/N/A)
```
Question: "Were customers greeted within 10 seconds?"
Options: 
  ☐ Yes (3)
  ☐ No (0)
  ☐ N/A
```

### ✅ After (Correct - Time-Based)
```
Item: "Greeted (No Queue)"
- Time: [Date/time picker] - When were they greeted?
- Sec: [Number input] - How many seconds did it take?
```

---

## 📊 What Gets Created

After running the fix, you'll have:

- **Trnx-1, Trnx-2, Trnx-3, Trnx-4:** 30 items each (Time/Sec pairs)
- **Avg:** 16 items (Sec only for averages)
- **Total:** 136 time-based items
- **NO Yes/No/N/A options**

---

## 🔍 Verify It Worked

### Check in Database

```sql
-- Should return NO rows (empty result)
SELECT ci.title, ci.input_type, cio.option_text
FROM checklist_items ci
LEFT JOIN checklist_item_options cio ON ci.id = cio.item_id
WHERE ci.category = 'SERVICE (Speed of Service)'
  AND ci.input_type = 'option_select'
  AND (cio.option_text LIKE '%Yes%' OR cio.option_text LIKE '%No%' OR cio.option_text LIKE '%N/A%');
```

### Check in Web App

1. Navigate to: `http://localhost:3000/audit/new/15`
2. Select "SERVICE (Speed of Service)" category
3. You should see:
   - ✅ Time/Sec pairs grouped together
   - ✅ Date/time pickers for Time fields
   - ✅ Number inputs for Sec fields
   - ✅ **NO Yes/No/N/A buttons**

---

## 📋 Proper Speed of Service Items (After Fix)

All items will be time-based:

1. **Table no.** (Number)
2. **Greeted (No Queue)** - Time + Sec
3. **Greeted (with Queue)** - Time + Sec
4. **Order taker approached** - Time + Sec
5. **Order taking time** - Time + Sec
6. **Straight Drinks served** - Time + Sec
7. **Cocktails / Mocktails served** - Time + Sec
8. **Starters served** - Time + Sec
9. **Main Course served (no starters)** - Time + Sec
10. **Main Course served (after starters)** - Time + Sec
11. **Captain / F&B Exe. follow-up** - Time + Sec
12. **Manager follow-up** - Time + Sec
13. **Dishes cleared** - Time + Sec
14. **Bill presented** - Time + Sec
15. **Receipt & change given** - Time + Sec
16. **Tables cleared, cleaned & set back** - Time + Sec

---

## 🎯 Summary

✅ **After Fix:**
- All items use **time-based inputs** (Time/Sec pairs)
- **NO Yes/No/N/A options**
- Requires **actual time measurements**
- **Objective and measurable data**

❌ **Before Fix:**
- Questions with Yes/No/N/A options
- Subjective answers
- No actual time data captured

---

**Run the fix now to replace all Yes/No/N/A items with proper time-based items!** 🚀
