# 📋 Manual Speed of Service Setup Guide

## 🎯 Overview

This guide will help you manually set up Speed of Service items with Time/Sec pairs organized in sections (Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg).

---

## 📝 Method 1: Using Backend API Endpoint (Recommended)

### Step 1: Start Backend Server

```bash
cd backend
npm start
```

Wait for: `Server running on port 5000`

### Step 2: Call the API Endpoint

**Option A: Using curl (Command Line)**

```bash
curl -X POST http://localhost:5000/api/templates/admin/update-speed-of-service \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "templateName": "CVR - CDR",
    "category": "SERVICE (Speed of Service)"
  }'
```

**Option B: Using Postman or Browser Extension**

1. Open Postman or REST Client extension
2. Create new POST request
3. URL: `http://localhost:5000/api/templates/admin/update-speed-of-service`
4. Headers:
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_AUTH_TOKEN`
5. Body (JSON):
   ```json
   {
     "templateName": "CVR - CDR",
     "category": "SERVICE (Speed of Service)"
   }
   ```
6. Click Send

**Option C: Using Browser Console (if logged in)**

1. Open browser console (F12)
2. Navigate to your web app (logged in as admin)
3. Run:
   ```javascript
   fetch('/api/templates/admin/update-speed-of-service', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer ' + localStorage.getItem('token') // or your auth method
     },
     body: JSON.stringify({
       templateName: 'CVR - CDR',
       category: 'SERVICE (Speed of Service)'
     })
   })
   .then(res => res.json())
   .then(data => console.log('Success:', data))
   .catch(err => console.error('Error:', err));
   ```

### Step 3: Verify Items Created

Check the response - it should show:
```json
{
  "success": true,
  "message": "Updated SERVICE (Speed of Service) in template \"CVR - CDR\"",
  "deletedItems": 0,
  "insertedItems": 150,
  "sections": ["Trnx-1", "Trnx-2", "Trnx-3", "Trnx-4", "Avg"]
}
```

---

## 📝 Method 2: Using Node.js Script

### Step 1: Run the Script

```bash
cd backend
node scripts/create-speed-of-service-items.js "CVR - CDR" "SERVICE (Speed of Service)"
```

### Step 2: Verify Output

You should see:
```
🚀 Creating Speed of Service items...
📋 Template: "CVR - CDR"
📂 Category: "SERVICE (Speed of Service)"

🔍 Looking for template...
✅ Found template: "CVR - CDR" (ID: 15)

🧹 Removing existing items...
   ✅ Deleted X existing items

📝 Inserting Speed of Service items...

   📦 Section: Trnx-1 (30 items)
      ✅ Table no.
      ✅ Greeted (No Queue) (Time)
      ✅ Greeted (No Queue) (Sec)
      ...

🎉 SUCCESS! Inserted 150 items
```

---

## 📝 Method 3: Manual Database Setup (Advanced)

If you need to manually create items in the database:

### Step 1: Connect to Database

**SQLite:**
```bash
sqlite3 backend/data/audit.db
```

**SQL Server:**
```bash
sqlcmd -S your-server -d your-database -U your-username
```

### Step 2: Find Template ID

```sql
SELECT id, name FROM checklist_templates WHERE name = 'CVR - CDR';
```

Note the `id` (e.g., `15`)

### Step 3: Create Items for Each Section

**Example for Trnx-1 section:**

```sql
-- Table no.
INSERT INTO checklist_items 
  (template_id, title, description, category, section, required, order_index, input_type, weight, is_critical)
VALUES 
  (15, 'Table no.', '', 'SERVICE (Speed of Service)', 'Trnx-1', 1, 0, 'number', 1, 0);

-- Greeted (No Queue) (Time)
INSERT INTO checklist_items 
  (template_id, title, description, category, section, required, order_index, input_type, weight, is_critical)
VALUES 
  (15, 'Greeted (No Queue) (Time)', '', 'SERVICE (Speed of Service)', 'Trnx-1', 1, 1, 'date', 1, 0);

-- Greeted (No Queue) (Sec)
INSERT INTO checklist_items 
  (template_id, title, description, category, section, required, order_index, input_type, weight, is_critical)
VALUES 
  (15, 'Greeted (No Queue) (Sec)', '', 'SERVICE (Speed of Service)', 'Trnx-1', 1, 2, 'number', 1, 0);

-- Continue for all items...
```

**Repeat for:**
- Trnx-2 (same items, section = 'Trnx-2')
- Trnx-3 (same items, section = 'Trnx-3')
- Trnx-4 (same items, section = 'Trnx-4')
- Avg (different items, section = 'Avg')

---

## 📋 Complete Item List for Manual Creation

### Items for Trnx-1, Trnx-2, Trnx-3, Trnx-4:

| Order | Title | Input Type | Section |
|-------|-------|------------|---------|
| 0 | Table no. | number | Trnx-X |
| 1 | Greeted (No Queue) (Time) | date | Trnx-X |
| 2 | Greeted (No Queue) (Sec) | number | Trnx-X |
| 3 | Greeted (with Queue) (Time) | date | Trnx-X |
| 4 | Greeted (with Queue) (Sec) | number | Trnx-X |
| 5 | Order taker approached (Time) | date | Trnx-X |
| 6 | Order taker approached (Sec) | number | Trnx-X |
| 7 | Order taking time (Time) | date | Trnx-X |
| 8 | Order taking time (Sec) | number | Trnx-X |
| 9 | Straight Drinks served (Time) | date | Trnx-X |
| 10 | Straight Drinks served (Sec) | number | Trnx-X |
| 11 | Cocktails / Mocktails served (Time) | date | Trnx-X |
| 12 | Cocktails / Mocktails served (Sec) | number | Trnx-X |
| 13 | Starters served (Time) | date | Trnx-X |
| 14 | Starters served (Sec) | number | Trnx-X |
| 15 | Main Course served (no starters) (Time) | date | Trnx-X |
| 16 | Main Course served (no starters) (Sec) | number | Trnx-X |
| 17 | Main Course served (after starters) (Time) | date | Trnx-X |
| 18 | Main Course served (after starters) (Sec) | number | Trnx-X |
| 19 | Captain / F&B Exe. follow-up after starter (Time) | date | Trnx-X |
| 20 | Captain / F&B Exe. follow-up after starter (Sec) | number | Trnx-X |
| 21 | Manager follow-up after mains (Time) | date | Trnx-X |
| 22 | Manager follow-up after mains (Sec) | number | Trnx-X |
| 23 | Dishes cleared (Time) | date | Trnx-X |
| 24 | Dishes cleared (Sec) | number | Trnx-X |
| 25 | Bill presented (Time) | date | Trnx-X |
| 26 | Bill presented (Sec) | number | Trnx-X |
| 27 | Receipt & change given (Time) | date | Trnx-X |
| 28 | Receipt & change given (Sec) | number | Trnx-X |
| 29 | Tables cleared, cleaned & set back (Time) | date | Trnx-X |
| 30 | Tables cleared, cleaned & set back (Sec) | number | Trnx-X |

### Items for Avg Section:

| Order | Title | Input Type | Section |
|-------|-------|------------|---------|
| 0 | Table no. | number | Avg |
| 1 | Greeted (with Queue) (Sec) | number | Avg |
| 2 | Greeted (No Queue) (Sec) | number | Avg |
| 3 | Order taker approached (Sec) | number | Avg |
| 4 | Order taking time (Sec) | number | Avg |
| 5 | Straight Drinks served (Sec) | number | Avg |
| 6 | Cocktails / Mocktails served (Sec) | number | Avg |
| 7 | Starters served (Sec) | number | Avg |
| 8 | Main Course served (no starters) (Sec) | number | Avg |
| 9 | Main Course served (after starters) (Sec) | number | Avg |
| 10 | Captain / F&B Exe. follow-up after starter (Sec) | number | Avg |
| 11 | Manager follow-up after mains (Sec) | number | Avg |
| 12 | Dishes cleared (Sec) | number | Avg |
| 13 | Bill presented (Sec) | number | Avg |
| 14 | Receipt & change given (Sec) | number | Avg |
| 15 | Tables cleared, cleaned & set back (Sec) | number | Avg |

---

## 🔧 Method 4: Using Web UI (Checklists Page)

### Step 1: Navigate to Checklists

1. Open web app: `http://localhost:3000`
2. Login as Admin
3. Go to **Checklists** page

### Step 2: Edit Template

1. Find "CVR - CDR" template
2. Click **Edit** button
3. Go to **Items** tab

### Step 3: Add Items Manually

For each item:

1. Click **Add Item** button
2. Fill in:
   - **Title:** e.g., "Greeted (No Queue) (Time)"
   - **Category:** "SERVICE (Speed of Service)"
   - **Section:** "Trnx-1" (or Trnx-2, Trnx-3, Trnx-4, Avg)
   - **Field Type:** 
     - Select "Date" for `(Time)` items
     - Select "Number" for `(Sec)` items
   - **Required:** Yes
   - **Order Index:** Sequential (0, 1, 2, ...)

3. Click **Save**

### Step 4: Repeat for All Items

- Create all 30 items for Trnx-1
- Create all 30 items for Trnx-2
- Create all 30 items for Trnx-3
- Create all 30 items for Trnx-4
- Create all 16 items for Avg

**Total: 136 items**

---

## ✅ Verification Steps

### Step 1: Check Items Created

**Using SQL:**
```sql
SELECT COUNT(*) as total_items, section, COUNT(*) as count
FROM checklist_items
WHERE template_id = 15 
  AND category = 'SERVICE (Speed of Service)'
GROUP BY section;
```

**Expected Output:**
```
section | count
--------|------
Trnx-1  | 30
Trnx-2  | 30
Trnx-3  | 30
Trnx-4  | 30
Avg     | 16
```

### Step 2: Verify Input Types

```sql
SELECT title, input_type, section
FROM checklist_items
WHERE template_id = 15 
  AND category = 'SERVICE (Speed of Service)'
  AND section = 'Trnx-1'
ORDER BY order_index;
```

**Expected:**
- Items with `(Time)` should have `input_type = 'date'`
- Items with `(Sec)` should have `input_type = 'number'`
- "Table no." should have `input_type = 'number'`

### Step 3: Test in Web App

1. Navigate to: `http://localhost:3000/audit/new/15?scheduled_id=1031&location_id=142`
2. Select "SERVICE (Speed of Service)" category
3. Verify:
   - ✅ Sections visible (Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg)
   - ✅ Time/Sec pairs grouped together
   - ✅ Input fields work correctly

---

## 🐛 Troubleshooting

### Issue: Items Not Showing in Sections

**Check:**
```sql
SELECT title, section, input_type
FROM checklist_items
WHERE template_id = 15 
  AND category LIKE '%Speed of Service%'
LIMIT 10;
```

**Fix:** Ensure `section` field is set correctly (Trnx-1, Trnx-2, etc.)

### Issue: Time/Sec Not Grouped

**Check:** Item titles must include `(Time)` or `(Sec)` exactly:
- ✅ "Greeted (No Queue) (Time)" - Correct
- ❌ "Greeted (No Queue) Time" - Wrong (missing parentheses)

**Fix:** Update titles to include `(Time)` or `(Sec)`

### Issue: Input Fields Not Showing

**Check:**
```sql
SELECT title, input_type
FROM checklist_items
WHERE title LIKE '%(Time)%' OR title LIKE '%(Sec)%';
```

**Fix:** 
- `(Time)` items must have `input_type = 'date'`
- `(Sec)` items must have `input_type = 'number'`

---

## 📊 Quick Reference

### Category Name
```
SERVICE (Speed of Service)
```

### Sections
- `Trnx-1` (30 items)
- `Trnx-2` (30 items)
- `Trnx-3` (30 items)
- `Trnx-4` (30 items)
- `Avg` (16 items)

### Input Types
- `date` - For `(Time)` items
- `number` - For `(Sec)` items and "Table no."

### Template Name
```
CVR - CDR
```

---

## 🚀 Quick Start (Easiest Method)

**Just run this command:**

```bash
cd backend
node scripts/create-speed-of-service-items.js "CVR - CDR" "SERVICE (Speed of Service)"
```

That's it! All items will be created automatically.

---

**Need Help?** Check the console output for any errors and verify the template name and category match exactly.
