# ✅ Fixed Code - With Authentication Token

## 🚀 Copy & Paste This Code in Browser Console

**On the page:** `http://localhost:3000/dashboard` (or any page where you're logged in)

**Press F12 → Console tab → Paste this:**

```javascript
// Get token from sessionStorage
const token = sessionStorage.getItem('auth_token');

if (!token) {
  alert('❌ Not logged in! Please login first.');
  console.error('No token found. Please login.');
} else {
  // Create Speed of Service items with Time/Sec pairs
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
}
```

---

## ✅ What Changed?

**Before (Missing Token):**
```javascript
headers: {
  'Content-Type': 'application/json'
  // ❌ Missing Authorization header!
}
```

**After (With Token):**
```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`  // ✅ Token included!
}
```

---

## 🎯 Steps:

1. **Make sure you're logged in** (you should see "ADMINISTRATOR" in sidebar)
2. **Press F12** → **Console** tab
3. **Paste the code above**
4. **Press Enter**
5. **Wait for success message**
6. **Refresh page** (F5)

---

## ✅ Expected Result:

You should see:
```
✅ SUCCESS! Created 136 items!

Sections: Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg
```

Then refresh and navigate to:
```
http://localhost:3000/audit/new/15?scheduled_id=1031&location_id=142
```

You'll see the new Time/Sec pairs! 🎉
