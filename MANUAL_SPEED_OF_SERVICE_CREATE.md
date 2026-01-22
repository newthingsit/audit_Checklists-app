# How to Create Speed of Service Items Manually

Choose one of these methods. **Method 1 (Node script)** is the fastest and creates all items with correct types and sections.

---

## Method 1: Node Script (Easiest — Recommended)

No login, no API token. Run from the project root with backend deps installed.

### 1. Start from project root

```powershell
cd D:\audit_Checklists-app\backend
```

### 2. Run the script

```powershell
node scripts/create-speed-of-service-items.js "CVR - CDR" "SERVICE (Speed of Service)"
```

- **First argument:** Template name (e.g. `CVR - CDR`).
- **Second argument:** Category (e.g. `SERVICE (Speed of Service)`).

### 3. Check the output

You should see something like:

```
🚀 Creating Speed of Service items...
📋 Template: "CVR - CDR"
📂 Category: "SERVICE (Speed of Service)"
✅ Found template: "CVR - CDR" (ID: 15)
🧹 Removing existing items...
📝 Inserting Speed of Service items...
   📦 Section: Trnx-1 (30 items)
   📦 Section: Trnx-2 (30 items)
   ...
🎉 SUCCESS! Inserted 150 items
```

**Note:** The script replaces existing items in that category. Make sure the template and category names match what you use in the app.

---

## Method 2: Admin API

Use this when the backend is running and you have an **admin** JWT.

### 1. Get an admin token

**Option A – From the web app (e.g. after login):**

1. Log in as admin.
2. Open DevTools (F12) → **Application** (or **Storage**) → **Local Storage**.
3. Find the token key (`token`, `auth_token`, or similar) and copy its value.

**Option B – From login response:**

1. `POST` to your auth login endpoint with admin credentials.
2. Copy the `token` (or `accessToken`) from the JSON response.

### 2. Call the admin endpoint

**PowerShell (Windows):**

```powershell
$token = "YOUR_ADMIN_JWT_TOKEN"
$body = @{ templateName = "CVR - CDR"; category = "SERVICE (Speed of Service)" } | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/templates/admin/update-speed-of-service" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $token" } `
  -Body $body
```

**curl (Bash / WSL / Git Bash):**

```bash
curl -X POST "http://localhost:5000/api/templates/admin/update-speed-of-service" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{"templateName":"CVR - CDR","category":"SERVICE (Speed of Service)"}'
```

### 3. Expected response

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

## Method 3: Web App (Checklists Page)

Use this to add or edit **individual** Speed of Service items. The Checklists UI does **not** expose a **Section** field (Trnx-1, Trnx-2, etc.), so sections will be empty. For full section support, use Method 1 or 2.

### 1. Open Checklists

1. Start backend and web:  
   - `cd backend` → `npm start`  
   - `cd web` → `npm start`
2. Open `http://localhost:3000`, log in as admin.
3. Go to **Checklists**.

### 2. Edit the template

1. Find the template (e.g. **CVR - CDR**).
2. Click **Edit**.

### 3. Add an item

1. Click **Add Item** (or edit an existing one).
2. Fill in:

   | Field       | Value                                                                 |
   |------------|-----------------------------------------------------------------------|
   | **Title**  | e.g. `Greeted (No Queue) (Time)` or `Greeted (No Queue) (Sec)`        |
   | **Category** | `SERVICE (Speed of Service)`                                        |
   | **Field Type** | **Date** for any `(Time)` item; **Number** for `(Sec)` and `Table no.` |
   | **Required** | Yes or No (as per your process)                                    |

3. **Important:** Do **not** choose **Single Answer**, **Option Select**, **Dropdown**, etc. Those create Yes/No/N/A. Use only **Date** or **Number** as above.

4. Save the item.
5. Repeat for each Speed of Service question.

### 4. Field Type reference

- **Date** → titles ending with `(Time)`  
  e.g. `Greeted (No Queue) (Time)`, `Order taker approached (Time)`.
- **Number** → titles ending with `(Sec)` and `Table no.`  
  e.g. `Greeted (No Queue) (Sec)`, `Table no.`.

Because **Section** is not in the form, all items will have `section = null`. To get Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg, use the script or the admin API.

---

## Method 4: Direct SQL (Advanced)

Use when you need full control and have DB access (SQLite, SQL Server, etc.).

### 1. Get the template ID

```sql
SELECT id, name FROM checklist_templates WHERE name = 'CVR - CDR';
```

Use the `id` (e.g. `15`) in the inserts below.

### 2. Insert pattern

For each item:

```sql
INSERT INTO checklist_items
  (template_id, title, description, category, section, required, order_index, input_type, weight, is_critical)
VALUES
  (15, 'Title here', '', 'SERVICE (Speed of Service)', 'Trnx-1', 1, 0, 'date', 1, 0);
```

- **`input_type`:**  
  - `'date'` for `(Time)` titles.  
  - `'number'` for `(Sec)` and `Table no.`
- **`section`:**  
  - `'Trnx-1'`, `'Trnx-2'`, `'Trnx-3'`, `'Trnx-4'` for transaction blocks.  
  - `'Avg'` for the average block.
- **`order_index`:** 0, 1, 2, … per section.

### 3. Full list for Trnx-1, Trnx-2, Trnx-3, Trnx-4

Use `section = 'Trnx-1'` (or Trnx-2, Trnx-3, Trnx-4) and `order_index` 0–30:

| order_index | Title | input_type |
|-------------|-------|------------|
| 0 | Table no. | number |
| 1 | Greeted (No Queue) (Time) | date |
| 2 | Greeted (No Queue) (Sec) | number |
| 3 | Greeted (with Queue) (Time) | date |
| 4 | Greeted (with Queue) (Sec) | number |
| 5 | Order taker approached (Time) | date |
| 6 | Order taker approached (Sec) | number |
| 7 | Order taking time (Time) | date |
| 8 | Order taking time (Sec) | number |
| 9 | Straight Drinks served (Time) | date |
| 10 | Straight Drinks served (Sec) | number |
| 11 | Cocktails / Mocktails served (Time) | date |
| 12 | Cocktails / Mocktails served (Sec) | number |
| 13 | Starters served (Time) | date |
| 14 | Starters served (Sec) | number |
| 15 | Main Course served (no starters) (Time) | date |
| 16 | Main Course served (no starters) (Sec) | number |
| 17 | Main Course served (after starters) (Time) | date |
| 18 | Main Course served (after starters) (Sec) | number |
| 19 | Captain / F&B Exe. follow-up after starter (Time) | date |
| 20 | Captain / F&B Exe. follow-up after starter (Sec) | number |
| 21 | Manager follow-up after mains (Time) | date |
| 22 | Manager follow-up after mains (Sec) | number |
| 23 | Dishes cleared (Time) | date |
| 24 | Dishes cleared (Sec) | number |
| 25 | Bill presented (Time) | date |
| 26 | Bill presented (Sec) | number |
| 27 | Receipt & change given (Time) | date |
| 28 | Receipt & change given (Sec) | number |
| 29 | Tables cleared, cleaned & set back (Time) | date |
| 30 | Tables cleared, cleaned & set back (Sec) | number |

### 4. Full list for Avg section

Use `section = 'Avg'` and `order_index` 0–15:

| order_index | Title | input_type |
|-------------|-------|------------|
| 0 | Table no. | number |
| 1 | Greeted (with Queue) (Sec) | number |
| 2 | Greeted (No Queue) (Sec) | number |
| 3 | Order taker approached (Sec) | number |
| 4 | Order taking time (Sec) | number |
| 5 | Straight Drinks served (Sec) | number |
| 6 | Cocktails / Mocktails served (Sec) | number |
| 7 | Starters served (Sec) | number |
| 8 | Main Course served (no starters) (Sec) | number |
| 9 | Main Course served (after starters) (Sec) | number |
| 10 | Captain / F&B Exe. follow-up after starter (Sec) | number |
| 11 | Manager follow-up after mains (Sec) | number |
| 12 | Dishes cleared (Sec) | number |
| 13 | Bill presented (Sec) | number |
| 14 | Receipt & change given (Sec) | number |
| 15 | Tables cleared, cleaned & set back (Sec) | number |

**SQLite:** `description` and optional columns can be `''` or `NULL` as in your schema.  
**SQL Server:** Use `NVARCHAR` and `NULL`/`''` as required by your `checklist_items` definition.

---

## Verify

### Count and types

```sql
SELECT section, input_type, COUNT(*) AS cnt
FROM checklist_items
WHERE category = 'SERVICE (Speed of Service)'
GROUP BY section, input_type
ORDER BY section, input_type;
```

You should see only `date` and `number`; no `option_select` for these items.

### In the app

1. Start an audit with a template that has **SERVICE (Speed of Service)**.
2. Open the **SERVICE (Speed of Service)** category.
3. Confirm:
   - `(Time)` items show a **date/time** picker.
   - `(Sec)` and **Table no.** show a **number** field.
   - No Yes/No/N/A options for these items.

---

## Quick reference

| What | Value |
|------|--------|
| **Category** | `SERVICE (Speed of Service)` |
| **Sections** | `Trnx-1`, `Trnx-2`, `Trnx-3`, `Trnx-4`, `Avg` |
| **`(Time)` items** | `input_type = 'date'` |
| **`(Sec)` and Table no.** | `input_type = 'number'` |
| **Template (example)** | `CVR - CDR` |

---

## Easiest one-liner

```powershell
cd D:\audit_Checklists-app\backend
node scripts/create-speed-of-service-items.js "CVR - CDR" "SERVICE (Speed of Service)"
```

Replace template and category if yours are different.
