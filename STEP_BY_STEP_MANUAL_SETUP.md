# 📖 Step-by-Step Manual Setup Guide

## 🎯 Goal
Create Speed of Service items with Time/Sec pairs in sections (Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg)

---

## ✅ Method 1: Using Script (Easiest - 2 Steps)

### Step 1: Open Terminal/PowerShell

Navigate to project folder:
```bash
cd d:\audit_Checklists-app
```

### Step 2: Run Script

```bash
node backend/scripts/create-speed-of-service-items.js "CVR - CDR" "SERVICE (Speed of Service)"
```

**Done!** ✅ All items created automatically.

**Expected Output:**
```
🚀 Creating Speed of Service items...
📋 Template: "CVR - CDR"
📂 Category: "SERVICE (Speed of Service)"

🔍 Looking for template...
✅ Found template: "CVR - CDR" (ID: 15)

🧹 Removing existing items...
📝 Inserting Speed of Service items...

   📦 Section: Trnx-1 (30 items)
      ✅ Table no.
      ✅ Greeted (No Queue) (Time)
      ✅ Greeted (No Queue) (Sec)
      ...

🎉 SUCCESS! Inserted 136 items
```

---

## ✅ Method 2: Using Web UI (Visual Method)

### Step 1: Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Web:**
```bash
cd web
npm start
```

### Step 2: Open Web App

1. Open browser: `http://localhost:3000`
2. Login as **Admin**

### Step 3: Navigate to Checklists

1. Click **"Checklists"** in sidebar
2. Find **"CVR - CDR"** template
3. Click **"Edit"** button (pencil icon)

### Step 4: Add Items

**For each item, follow these steps:**

1. Click **"Add Item"** button
2. Fill the form:
   ```
   Title: Greeted (No Queue) (Time)
   Category: SERVICE (Speed of Service)
   Section: Trnx-1
   Field Type: Date
   Required: Yes
   ```
3. Click **"Save"**

4. Repeat for next item:
   ```
   Title: Greeted (No Queue) (Sec)
   Category: SERVICE (Speed of Service)
   Section: Trnx-1
   Field Type: Number
   Required: Yes
   ```

### Step 5: Complete All Items

**For Trnx-1, Trnx-2, Trnx-3, Trnx-4 (30 items each):**

1. Table no. (Number)
2. Greeted (No Queue) (Time) - Date
3. Greeted (No Queue) (Sec) - Number
4. Greeted (with Queue) (Time) - Date
5. Greeted (with Queue) (Sec) - Number
6. Order taker approached (Time) - Date
7. Order taker approached (Sec) - Number
8. Order taking time (Time) - Date
9. Order taking time (Sec) - Number
10. Straight Drinks served (Time) - Date
11. Straight Drinks served (Sec) - Number
12. Cocktails / Mocktails served (Time) - Date
13. Cocktails / Mocktails served (Sec) - Number
14. Starters served (Time) - Date
15. Starters served (Sec) - Number
16. Main Course served (no starters) (Time) - Date
17. Main Course served (no starters) (Sec) - Number
18. Main Course served (after starters) (Time) - Date
19. Main Course served (after starters) (Sec) - Number
20. Captain / F&B Exe. follow-up after starter (Time) - Date
21. Captain / F&B Exe. follow-up after starter (Sec) - Number
22. Manager follow-up after mains (Time) - Date
23. Manager follow-up after mains (Sec) - Number
24. Dishes cleared (Time) - Date
25. Dishes cleared (Sec) - Number
26. Bill presented (Time) - Date
27. Bill presented (Sec) - Number
28. Receipt & change given (Time) - Date
29. Receipt & change given (Sec) - Number
30. Tables cleared, cleaned & set back (Time) - Date
31. Tables cleared, cleaned & set back (Sec) - Number

**For Avg Section (16 items):**

1. Table no. (Number)
2. Greeted (with Queue) (Sec) - Number
3. Greeted (No Queue) (Sec) - Number
4. Order taker approached (Sec) - Number
5. Order taking time (Sec) - Number
6. Straight Drinks served (Sec) - Number
7. Cocktails / Mocktails served (Sec) - Number
8. Starters served (Sec) - Number
9. Main Course served (no starters) (Sec) - Number
10. Main Course served (after starters) (Sec) - Number
11. Captain / F&B Exe. follow-up after starter (Sec) - Number
12. Manager follow-up after mains (Sec) - Number
13. Dishes cleared (Sec) - Number
14. Bill presented (Sec) - Number
15. Receipt & change given (Sec) - Number
16. Tables cleared, cleaned & set back (Sec) - Number

**Total: 136 items** (30×4 + 16 = 136)

---

## ✅ Method 3: Using API (Programmatic)

### Step 1: Get Auth Token

1. Login to web app
2. Open browser console (F12)
3. Run:
   ```javascript
   // Get token from localStorage or cookies
   const token = localStorage.getItem('token') || document.cookie.match(/token=([^;]+)/)?.[1];
   console.log('Token:', token);
   ```

### Step 2: Call API

**In Browser Console:**
```javascript
fetch('/api/templates/admin/update-speed-of-service', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    templateName: 'CVR - CDR',
    category: 'SERVICE (Speed of Service)'
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Success!', data);
  alert('Created ' + data.insertedItems + ' items!');
})
.catch(err => {
  console.error('❌ Error:', err);
  alert('Error: ' + err.message);
});
```

---

## ✅ Method 4: Using Postman

### Step 1: Setup Request

1. Open Postman
2. Create new **POST** request
3. URL: `http://localhost:5000/api/templates/admin/update-speed-of-service`

### Step 2: Add Headers

Click **Headers** tab, add:
- Key: `Content-Type`, Value: `application/json`
- Key: `Authorization`, Value: `Bearer YOUR_TOKEN_HERE`

### Step 3: Add Body

Click **Body** tab:
- Select **raw**
- Select **JSON**
- Paste:
  ```json
  {
    "templateName": "CVR - CDR",
    "category": "SERVICE (Speed of Service)"
  }
  ```

### Step 4: Send

Click **Send** button

**Expected Response:**
```json
{
  "success": true,
  "message": "Updated SERVICE (Speed of Service) in template \"CVR - CDR\"",
  "deletedItems": 0,
  "insertedItems": 136,
  "sections": ["Trnx-1", "Trnx-2", "Trnx-3", "Trnx-4", "Avg"]
}
```

---

## 🔍 Verification

### Check Items Created

**Option 1: Database Query**
```sql
SELECT section, COUNT(*) as count
FROM checklist_items
WHERE template_id = 15 
  AND category = 'SERVICE (Speed of Service)'
GROUP BY section;
```

**Option 2: Web UI**
1. Go to Checklists page
2. Edit "CVR - CDR" template
3. Check Items tab
4. Filter by category: "SERVICE (Speed of Service)"
5. Verify sections and items

**Option 3: Test Audit Form**
1. Navigate to: `http://localhost:3000/audit/new/15`
2. Select "SERVICE (Speed of Service)" category
3. Verify sections appear

---

## 📋 Quick Checklist

- [ ] Backend server running (`npm start` in backend folder)
- [ ] Web server running (`npm start` in web folder)
- [ ] Logged in as Admin
- [ ] Template "CVR - CDR" exists
- [ ] Items created (136 total)
- [ ] Sections visible (Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg)
- [ ] Time/Sec pairs grouped together
- [ ] Input fields working

---

## 🎯 Recommended Method

**Use Method 1 (Script)** - It's the fastest and most reliable:

```bash
node backend/scripts/create-speed-of-service-items.js "CVR - CDR" "SERVICE (Speed of Service)"
```

Takes less than 1 minute and creates all 136 items automatically! ✅

---

**Need Help?** Check the console output for any errors.
