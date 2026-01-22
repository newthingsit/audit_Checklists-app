# Speed of Service (SOS) Checklist – Step-by-Step Manual Guide

This checklist is used to:

1. **Enter the table number** (manually type)
2. **Enter the name of the dish**
3. **Enter the time in minutes** to make the item, 5 times (Attempt 1 to 5)
4. **See the average** calculated automatically from those 5 times

---

## Flow

- **Table** → Type the table number manually (e.g. "1", "5", "A1")
- **Name of dish** → Type the dish name
- **Time – Attempt 1 to 5** → Enter time in **minutes** for each attempt
- **Average (Auto)** → Filled automatically; do not type here

---

## How to Create This Checklist Manually in the UI

### Before you start

1. Open the **Checklists** page in the web app.
2. Either:
   - **Add** a new template, or  
   - **Edit** an existing template (e.g. “Speed of Service” or “CVR - CDR”).

---

### Step 1: Create the template (if new)

1. Click **Add** (or **Add Template**).
2. **Name:** `Speed of Service` (or any name you use).
3. **Description:** e.g. *Select table, dish name, 5 times in minutes, average auto-calculated.*
4. Click **Save** or go to the **Items** tab to add items.

---

### Step 2: Item 1 – Table (text input)

1. Click **Add Item**.
2. Fill in:

   | Field       | Value |
   |------------|-------|
   | **Title**  | `Table` |
   | **Description** | `Enter the table number` |
   | **Category** | `Speed of Service` |
   | **Section** | None |
   | **Field Type** | **Short Answer** |
   | **Required** | Yes |

3. Save the item.

> **Note:** The user will manually type the table number (e.g. "1", "5", "A1", etc.).

---

### Step 3: Item 2 – Name of dish

1. Click **Add Item** (Category and Section will copy from the previous item).
2. Fill in:

   | Field       | Value |
   |------------|-------|
   | **Title**  | `Name of dish` |
   | **Description** | `Enter the name of the dish` |
   | **Category** | `Speed of Service` |
   | **Section** | None |
   | **Field Type** | **Short Answer** |
   | **Required** | Yes |

3. Save the item.

---

### Step 4: Items 3–7 – Time – Attempt 1 to 5

For each of these, add one item. Titles must be exactly:

- `Time – Attempt 1`
- `Time – Attempt 2`
- `Time – Attempt 3`
- `Time – Attempt 4`
- `Time – Attempt 5`

Example for **Time – Attempt 1**:

| Field       | Value |
|------------|-------|
| **Title**  | `Time – Attempt 1` |
| **Description** | `Time in minutes` |
| **Category** | `Speed of Service` |
| **Section** | None |
| **Field Type** | **Number** |
| **Required** | Yes |

Repeat for Attempt 2, 3, 4, 5. Only the **Title** changes (`Time – Attempt 2`, etc.).  
Use **Add Item** so Category stays `Speed of Service`.

---

### Step 5: Item 8 – Average (Auto)

1. Click **Add Item**.
2. Fill in:

   | Field       | Value |
   |------------|-------|
   | **Title**  | `Average (Auto)` |
   | **Description** | `Auto-calculated from Attempts 1–5 (minutes).` |
   | **Category** | `Speed of Service` |
   | **Section** | None |
   | **Field Type** | **Number** |
   | **Required** | No |

3. Save the item.

The app will treat this as a read‑only, auto-calculated field.  
The **title must be exactly** `Average (Auto)` (including the parentheses and “Auto”) for auto-calculation to work.

---

### Step 6: Save the template

1. Click **Save** on the template.
2. Ensure the 8 items are in this order:

   1. Table  
   2. Name of dish  
   3. Time – Attempt 1  
   4. Time – Attempt 2  
   5. Time – Attempt 3  
   6. Time – Attempt 4  
   7. Time – Attempt 5  
   8. Average (Auto)  

---

## Important: Exact titles for auto-calculation

For the average to be calculated automatically:

- The 5 time fields **must** be named exactly:  
  `Time – Attempt 1`, `Time – Attempt 2`, … `Time – Attempt 5`  
  (with “Time”, en‑dash or hyphen, space, “Attempt”, space, and the number).
- The average field **must** be named exactly:  
  `Average (Auto)`  
  (with parentheses and “Auto”).

If you change these titles, auto-calculation will not run.

---

## Quick reference

| # | Title | Field Type | Required | Notes |
|---|-------|------------|----------|-------|
| 1 | Table | Short Answer | Yes | Manually type table number |
| 2 | Name of dish | Short Answer | Yes | |
| 3 | Time – Attempt 1 | Number | Yes | Time in minutes |
| 4 | Time – Attempt 2 | Number | Yes | Time in minutes |
| 5 | Time – Attempt 3 | Number | Yes | Time in minutes |
| 6 | Time – Attempt 4 | Number | Yes | Time in minutes |
| 7 | Time – Attempt 5 | Number | Yes | Time in minutes |
| 8 | Average (Auto) | Number | No | Auto-calculated; do not type |

**Category for all items:** `Speed of Service`  
**Section for all items:** None

---

## Creating via script (optional)

From the project root:

```powershell
cd backend
node scripts/create-simple-sos-checklist.js
```

This creates or updates a template **"Speed of Service"** with these 8 items.  
To add the same 8 items to another template:

```powershell
node scripts/create-simple-sos-checklist.js "Your Template Name"
```

---

## How it works in an audit

1. **Table** – User manually types the table number (e.g. "1", "5", "A1").
2. **Name of dish** – User types the dish name.
3. **Time – Attempt 1 to 5** – User enters the time in **minutes** for each of the 5 attempts.
4. **Average (Auto)** – As soon as at least one of the 5 times is entered, the app computes the average of all non‑empty numeric values and shows it here. It is read‑only and is saved with the audit.

The average uses all 5 values when all are filled; if only some are filled, it uses the ones that are valid numbers.
