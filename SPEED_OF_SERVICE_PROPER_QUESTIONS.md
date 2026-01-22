# ✅ Proper Speed of Service Questions (Time-Based, Not Yes/No/N/A)

## 🎯 Current Implementation Status

The Speed of Service items are **already properly configured** as time-based questions that do NOT create Yes/No/N/A options.

---

## 📋 Current Speed of Service Items (Time-Based Format)

### ✅ Proper Format (Time/Sec Pairs)

All items use **Time/Sec pairs** which require:
- **Time field:** Date/time input (when the event occurred)
- **Sec field:** Number input (duration in seconds)

**This format does NOT create Yes/No/N/A options** - it requires actual time measurements.

---

## 📊 Complete List of Speed of Service Items

### For Sections: Trnx-1, Trnx-2, Trnx-3, Trnx-4

Each section contains these items (as Time/Sec pairs):

1. **Table no.** (Number input)
2. **Greeted (No Queue)** 
   - Time: Date/time when customer was greeted (no queue)
   - Sec: Duration in seconds
3. **Greeted (with Queue)**
   - Time: Date/time when customer was greeted (with queue)
   - Sec: Duration in seconds
4. **Order taker approached**
   - Time: Date/time when order taker approached
   - Sec: Duration in seconds
5. **Order taking time**
   - Time: Date/time when order was taken
   - Sec: Duration in seconds
6. **Straight Drinks served**
   - Time: Date/time when drinks were served
   - Sec: Duration in seconds
7. **Cocktails / Mocktails served**
   - Time: Date/time when cocktails/mocktails were served
   - Sec: Duration in seconds
8. **Starters served**
   - Time: Date/time when starters were served
   - Sec: Duration in seconds
9. **Main Course served (no starters)**
   - Time: Date/time when main course was served (no starters ordered)
   - Sec: Duration in seconds
10. **Main Course served (after starters)**
    - Time: Date/time when main course was served (after starters)
    - Sec: Duration in seconds
11. **Captain / F&B Exe. follow-up after starter**
    - Time: Date/time of follow-up
    - Sec: Duration in seconds
12. **Manager follow-up after mains**
    - Time: Date/time of manager follow-up
    - Sec: Duration in seconds
13. **Dishes cleared**
    - Time: Date/time when dishes were cleared
    - Sec: Duration in seconds
14. **Bill presented**
    - Time: Date/time when bill was presented
    - Sec: Duration in seconds
15. **Receipt & change given**
    - Time: Date/time when receipt/change was given
    - Sec: Duration in seconds
16. **Tables cleared, cleaned & set back**
    - Time: Date/time when table was cleared and reset
    - Sec: Duration in seconds

### For Section: Avg (Average)

Contains only Sec (seconds) fields for calculating averages:

1. **Table no.** (Number input)
2. **Greeted (with Queue) (Sec)** - Average seconds
3. **Greeted (No Queue) (Sec)** - Average seconds
4. **Order taker approached (Sec)** - Average seconds
5. **Order taking time (Sec)** - Average seconds
6. **Straight Drinks served (Sec)** - Average seconds
7. **Cocktails / Mocktails served (Sec)** - Average seconds
8. **Starters served (Sec)** - Average seconds
9. **Main Course served (no starters) (Sec)** - Average seconds
10. **Main Course served (after starters) (Sec)** - Average seconds
11. **Captain / F&B Exe. follow-up after starter (Sec)** - Average seconds
12. **Manager follow-up after mains (Sec)** - Average seconds
13. **Dishes cleared (Sec)** - Average seconds
14. **Bill presented (Sec)** - Average seconds
15. **Receipt & change given (Sec)** - Average seconds
16. **Tables cleared, cleaned & set back (Sec)** - Average seconds

---

## ✅ Why This Format is Correct

### ❌ Old Format (Yes/No/N/A - NOT USED)
```
Question: "Were customers greeted within 10 seconds?"
Options: Yes (3) / No (0) / N/A
```
**Problem:** Subjective, binary answer, doesn't capture actual time.

### ✅ Current Format (Time-Based - CORRECT)
```
Item: "Greeted (No Queue)"
- Time: [Date/time picker] - When were they greeted?
- Sec: [Number input] - How many seconds did it take?
```
**Advantage:** 
- Captures actual time measurements
- Objective data
- No Yes/No/N/A options needed
- Allows for precise analysis

---

## 🔍 Verification

### Check Database

```sql
-- Verify all Speed of Service items use time-based inputs
SELECT 
  title, 
  input_type, 
  section
FROM checklist_items
WHERE category = 'SERVICE (Speed of Service)'
ORDER BY section, order_index;
```

**Expected Results:**
- Items with `(Time)` → `input_type = 'date'`
- Items with `(Sec)` → `input_type = 'number'`
- **NO items with `input_type = 'option_select'`** (which would create Yes/No/N/A)

### Check for Yes/No/N/A Options

```sql
-- Check if any Speed of Service items have Yes/No/N/A options
SELECT 
  ci.title,
  ci.input_type,
  cio.option_text
FROM checklist_items ci
LEFT JOIN checklist_item_options cio ON ci.id = cio.item_id
WHERE ci.category = 'SERVICE (Speed of Service)'
  AND ci.input_type = 'option_select'
  AND (cio.option_text LIKE '%Yes%' OR cio.option_text LIKE '%No%' OR cio.option_text LIKE '%N/A%');
```

**Expected Result:** No rows (empty result)

---

## 🎯 Summary

✅ **Current Implementation is CORRECT:**
- All Speed of Service items use **time-based inputs** (Time/Sec pairs)
- **NO Yes/No/N/A options** are created
- Items require **actual time measurements** (date/time + seconds)
- Format is **objective and measurable**

❌ **Old Format (NOT USED):**
- Questions like "Were customers greeted within 10 seconds?"
- Options: Yes/No/N/A
- **This format is NOT in the current implementation**

---

## 📝 If You See Yes/No/N/A Options

If you're seeing Yes/No/N/A options in the Speed of Service category, it means:

1. **Old items exist in database** - Run the update script to replace them:
   ```bash
   node backend/scripts/create-speed-of-service-items.js "CVR - CDR" "SERVICE (Speed of Service)"
   ```

2. **Or use API endpoint:**
   ```javascript
   fetch('/api/templates/admin/update-speed-of-service', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       templateName: 'CVR - CDR',
       category: 'SERVICE (Speed of Service)'
     })
   })
   ```

This will **replace all old Yes/No/N/A items** with proper time-based Time/Sec pairs.

---

**Status:** ✅ All Speed of Service questions are properly configured as time-based inputs (no Yes/No/N/A options).
