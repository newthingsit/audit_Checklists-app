# 🎯 Simple Manual Guide - Speed of Service Setup

## ⚡ Fastest Method (Recommended)

### Just Run This Command:

```bash
cd backend
node scripts/create-speed-of-service-items.js "CVR - CDR" "SERVICE (Speed of Service)"
```

**That's it!** ✅ All items created in 30 seconds.

---

## 📋 Alternative: Using Web Browser

### Step 1: Open Browser Console

1. Open: `http://localhost:3000`
2. Login as Admin
3. Press **F12** (or Right-click → Inspect)
4. Go to **Console** tab

### Step 2: Copy & Paste This Code

```javascript
// Create Speed of Service items
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
  if (data.success) {
    alert('✅ Success! Created ' + data.insertedItems + ' items');
    console.log('Sections:', data.sections);
  } else {
    alert('❌ Error: ' + (data.error || 'Unknown error'));
  }
})
.catch(err => {
  alert('❌ Error: ' + err.message);
  console.error(err);
});
```

### Step 3: Press Enter

Wait for success message! ✅

---

## 🔍 Verify It Worked

### Option 1: Check Console Output

You should see:
```
✅ Success! Created 136 items
Sections: ["Trnx-1", "Trnx-2", "Trnx-3", "Trnx-4", "Avg"]
```

### Option 2: Test in Audit Form

1. Navigate to: `http://localhost:3000/audit/new/15?scheduled_id=1031&location_id=142`
2. Select **"SERVICE (Speed of Service)"** category
3. You should see:
   - ✅ Sections: Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg
   - ✅ Time/Sec pairs grouped together
   - ✅ Input fields working

---

## 🐛 If It Doesn't Work

### Check 1: Are you logged in as Admin?

- Must be Admin user
- Check user role in profile

### Check 2: Is backend running?

```bash
# Check if backend is running
curl http://localhost:5000/api/templates/health
```

Should return: `{"status":"ok",...}`

### Check 3: Does template exist?

```javascript
// In browser console
fetch('/api/templates')
  .then(res => res.json())
  .then(data => {
    const template = data.find(t => t.name === 'CVR - CDR');
    console.log('Template found:', template);
  });
```

---

## 📊 What Gets Created

- **Trnx-1:** 30 items (Time/Sec pairs)
- **Trnx-2:** 30 items (Time/Sec pairs)
- **Trnx-3:** 30 items (Time/Sec pairs)
- **Trnx-4:** 30 items (Time/Sec pairs)
- **Avg:** 16 items (Sec only)

**Total: 136 items**

---

## ✅ Success Indicators

After running the setup:

1. ✅ No errors in console
2. ✅ Success message appears
3. ✅ Sections visible in audit form
4. ✅ Time/Sec pairs grouped together
5. ✅ Can enter values in fields

---

**That's all!** 🎉

If you see any errors, share the error message and I'll help fix it.
