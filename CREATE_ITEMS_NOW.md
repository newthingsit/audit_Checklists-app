# 🚀 Create Speed of Service Items NOW

## ⚡ Quick Method: Use Browser Console

### Step 1: Open Your Audit Form Page
You're already on: `http://localhost:3000/audit/new/15?scheduled_id=1031&location_id=142`

### Step 2: Open Browser Console
- Press **F12** (or Right-click → Inspect)
- Click **Console** tab

### Step 3: Copy & Paste This Code

```javascript
// Create Speed of Service items with Time/Sec pairs
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
    alert('✅ SUCCESS! Created ' + data.insertedItems + ' items!\n\nSections: ' + data.sections.join(', '));
    console.log('✅ Created items:', data);
    // Refresh the page to see new items
    setTimeout(() => {
      if (confirm('Items created! Refresh page to see them?')) {
        window.location.reload();
      }
    }, 1000);
  } else {
    alert('❌ Error: ' + (data.error || data.message || 'Unknown error'));
    console.error('Error:', data);
  }
})
.catch(err => {
  alert('❌ Network Error: ' + err.message);
  console.error('Error:', err);
});
```

### Step 4: Press Enter

Wait for the success message! ✅

### Step 5: Refresh Page
After success, refresh the page (F5) to see the new Time/Sec items!

---

## ✅ What You Should See After Refresh

Instead of Yes/No/NA questions, you'll see:

1. **Sections:** Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg
2. **Time/Sec Pairs:** Grouped together side-by-side
3. **Input Fields:**
   - Date picker for `(Time)` items
   - Number input for `(Sec)` items
4. **Section Controls:** Collapse/Expand buttons

---

## 🐛 If It Doesn't Work

**Check 1:** Are you logged in as Admin?
- Must be Admin user
- Check your user role

**Check 2:** Is backend running?
- Should be running on port 5000
- Check: `http://localhost:5000/api/templates/health`

**Check 3:** Check console for errors
- Look for red error messages
- Share the error if you see one

---

**Try it now!** 🚀
