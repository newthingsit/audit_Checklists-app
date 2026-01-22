# ⚡ Quick Manual Setup Guide

## 🎯 Fastest Way to Set Up Speed of Service

### Option 1: One Command (Easiest) ✅

```bash
cd backend
node scripts/create-speed-of-service-items.js "CVR - CDR" "SERVICE (Speed of Service)"
```

**That's it!** All 136 items will be created automatically.

---

### Option 2: Using API (If you have admin access)

**In Browser Console (F12) - while logged in:**

```javascript
fetch('/api/templates/admin/update-speed-of-service', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    templateName: 'CVR - CDR',
    category: 'SERVICE (Speed of Service)'
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Success!', data);
  alert('Speed of Service items created!');
})
.catch(err => {
  console.error('❌ Error:', err);
  alert('Error: ' + err.message);
});
```

---

### Option 3: Using Postman/API Client

1. **URL:** `POST http://localhost:5000/api/templates/admin/update-speed-of-service`
2. **Headers:**
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_TOKEN`
3. **Body:**
   ```json
   {
     "templateName": "CVR - CDR",
     "category": "SERVICE (Speed of Service)"
   }
   ```

---

## ✅ Verify It Worked

**Check in Database:**
```sql
SELECT section, COUNT(*) as count
FROM checklist_items
WHERE template_id = 15 
  AND category = 'SERVICE (Speed of Service)'
GROUP BY section;
```

**Expected:**
- Trnx-1: 30 items
- Trnx-2: 30 items
- Trnx-3: 30 items
- Trnx-4: 30 items
- Avg: 16 items

**Total: 136 items**

---

## 🧪 Test It

1. Open: `http://localhost:3000/audit/new/15?scheduled_id=1031&location_id=142`
2. Select "SERVICE (Speed of Service)" category
3. You should see:
   - ✅ Sections: Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg
   - ✅ Time/Sec pairs grouped together
   - ✅ Input fields working

---

**That's it!** 🎉
