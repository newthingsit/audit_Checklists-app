# CSV Import from Web App Guide

## ✅ Good News!

The CSV import feature **is already built into the web app** and is production-ready! 

You can download a CSV file locally and import it directly from the browser at: https://app.litebitefoods.com/checklists

---

## 🚀 How to Use

### Step 1: Go to Checklists Page
1. Navigate to https://app.litebitefoods.com/checklists
2. Look for the **"Import CSV"** button (top right, next to "Add Template")

### Step 2: Open Import Dialog
Click the "Import CSV" button to open the import dialog.

### Step 3: Upload Your CSV File

**Option A: Upload File**
1. Click "Upload CSV File"
2. Select your CSV file from your computer (e.g., CVR_CDR_Checklist_checklist.csv)
3. File content automatically loads into the preview area

**Option B: Paste CSV Data**
- Paste CSV content directly into the "Paste CSV Data" text field

### Step 4: Enter Template Details

| Field | Required | Example |
|-------|----------|---------|
| **Template Name** | ✅ YES | "CVR - CDR Checklist" |
| **Description** | ❌ Optional | "Complete audit template for CVR" |

### Step 5: Review Preview

The dialog shows:
- ✓ Number of items detected (e.g., "Preview: 252 item(s) found")
- ✓ Column mapping (Title, Category, Type, etc.)
- ✓ Any parsing errors

### Step 6: Import

Click **"Import Template"** button to create the template with all items.

---

## 📋 CSV Format Requirements

### Required Columns
- **title** (or item_name, item, name)

### Optional Columns
- description (or desc)
- category (or cat)
- **subcategory** (or subcat, sub_category) - for grouping
- **section** (or sec) - for sub-grouping
- input_type (or type, field_type)
- required (or req) - YES/NO/1/0
- weight - numeric priority
- is_critical (or critical) - YES/NO/1/0
- options (or choices) - Label:Score format

### Options Format

Format: `Label:Score|Label:Score|Label:Score`

Examples:
- `Yes:3|No:0|NA:NA`
- `Excellent:5|Good:4|Fair:2|Poor:0`
- `Pass|Fail|Pending`

---

## 📁 Sample CSV Files

Ready-to-use CSV files in your project:

```
d:\audit_Checklists-app\
├── CVR_CDR_Checklist_checklist.csv         ✅ Full CVR-CDR (252 items)
├── CVR_QSR_checklist.csv                   ✅ QSR template (174 items)
├── checklist-import-sample.csv             ✅ Basic sample
├── checklist-template-sample.csv           ✅ Template example
└── speed-of-service-tracking-template.csv  ✅ SOS template
```

### How to Use Sample Files

1. Download any CSV file from the workspace
2. Go to https://app.litebitefoods.com/checklists
3. Click "Import CSV"
4. Upload the file
5. Give it a name
6. Click "Import Template"

---

## ✨ Features Included

✅ **File Upload**
- Select CSV from your computer
- Drag-and-drop support

✅ **Data Preview**
- Live preview of items before import
- Shows: Title, Category, Subcategory, Section, Type, Required status
- Error highlighting

✅ **Flexible Column Detection**
- Automatically finds title, category, input_type, etc.
- Handles multiple column name variants
- Smart category normalization

✅ **Options Parsing**
- Automatically parses "Yes:3|No:0|NA:NA" format
- Creates option selections
- Maintains score/mark values

✅ **Real-time Validation**
- Checks CSV format
- Validates required columns
- Shows parse errors immediately

✅ **Progress Tracking**
- Shows item count
- Displays import status
- Success/error messages

---

## 🔒 Permissions

This feature requires:
- ✅ Admin role, OR
- ✅ User with "manage_templates" permission

If you don't see the "Import CSV" button, contact an administrator to grant permissions.

---

## 🔧 API Endpoint (Developers)

The feature uses the existing backend API:

**Endpoint:** `POST /api/checklists/import/csv`

**Request:**
```javascript
{
  templateName: "CVR - CDR Checklist",
  description: "Optional description",
  category: "",  // Optional
  csvData: "title,category,input_type,...\nItem1,Category1,option_select,..."
}
```

**Response:**
```javascript
{
  success: true,
  message: "Template \"CVR - CDR Checklist\" created with 252 items",
  templateId: 85,
  itemCount: 252
}
```

**Permissions:** Requires `manage_templates` permission (Admin)

---

## 🐛 Troubleshooting

### Issue: "Import CSV" button not visible

**Solutions:**
1. Check you're logged in as Admin
2. Verify user has "manage_templates" permission
3. Refresh the page (Ctrl+F5)
4. Check browser console for errors

### Issue: CSV Upload not working

**Solutions:**
1. Verify file is in .csv format
2. Check file size (<10MB recommended)
3. Ensure file has proper headers
4. Try pasting content instead of uploading

### Issue: "Template name and CSV data are required"

**Solutions:**
1. Enter a template name
2. Paste or upload CSV data
3. Check CSV has at least 2 rows (header + 1 item)

### Issue: "CSV must have a title column"

**Solutions:**
1. Rename your column to: `title`, `item`, `item_name`, or `name`
2. Check for typos in header
3. Verify first row contains headers

### Issue: "Please fix CSV errors before importing"

**Solutions:**
1. Review error message in dialog
2. Check for:
   - Unmatched quotes
   - Extra/missing commas
   - Non-ASCII characters
3. Try downloading sample CSV to see correct format

### Issue: Items not importing with options

**Solutions:**
1. Check options format: `Yes:3|No:0|NA:NA` (pipe-separated)
2. Use `|` not `,` between options
3. Use `:` to separate label from score
4. Examples that work:
   - `Yes:3|No:0` ✅
   - `Pass|Fail` ✅
   - `Excellent:5|Good:4|Fair:2|Poor:0` ✅

---

## 📊 Example Workflow

### Import CVR-CDR Checklist from Local CSV

1. **Locate file:**
   - `d:\audit_Checklists-app\CVR_CDR_Checklist_checklist.csv`

2. **Go to web app:**
   - https://app.litebitefoods.com/checklists

3. **Click "Import CSV"**

4. **Upload file:**
   - Click "Upload CSV File"
   - Select `CVR_CDR_Checklist_checklist.csv`

5. **Enter details:**
   - Template Name: "CVR - CDR Production"
   - Description: "Production copy of CVR-CDR audit"

6. **Review preview:**
   - Confirms 252 items will be imported
   - Shows category distribution

7. **Click "Import Template"**

8. **Done!**
   - Template appears in checklist list
   - Ready to create audits

---

## 💡 Tips

1. **Download Sample:** Click "Download Import Template (Sample CSV)" to see correct format

2. **Test First:** Import with a test name first, verify in app, delete if needed

3. **Batch Import:** Repeat process for multiple CSV files

4. **Sub-categories:** Use both `category` and `subcategory` columns for better organization

5. **Section Grouping:** Add `section` column to group items (e.g., "Trnx-1", "Trnx-2", "Kitchen")

---

## ✅ Verification After Import

After importing, verify:

1. ✓ Template appears in Checklists list
2. ✓ Item count matches CSV (e.g., 252 items)
3. ✓ Categories are correctly assigned
4. ✓ Options appear as dropdown selections
5. ✓ Required/optional flags correct
6. ✓ Can create new audit with template
7. ✓ All items display in audit form

---

## 🎯 Common Workflows

### Workflow 1: Import CVR-CDR (Local to Production Web App)

```
Local File (CVR_CDR_Checklist_checklist.csv)
  ↓
Download CSV
  ↓
Open https://app.litebitefoods.com/checklists
  ↓
Click "Import CSV"
  ↓
Upload CSV file
  ↓
Enter template name
  ↓
Review preview (252 items)
  ↓
Click "Import Template"
  ↓
Template appears in web app ✅
```

### Workflow 2: Import Multiple Checklists

```
For each CSV file:
  1. Go to Checklists page
  2. Click "Import CSV"
  3. Upload file
  4. Enter name
  5. Click "Import"
  
Result: All templates imported to web app
```

### Workflow 3: Test Before Production

```
1. Import with test name: "CVR - Test"
2. Verify in web app
3. Create test audit
4. Check all items and options
5. If OK: Create production copy "CVR - Production"
6. Delete test template
```

---

## Summary

✅ **CSV import is fully integrated into the web app**

✅ **No additional setup needed**

✅ **Works with local CSV files**

✅ **Direct browser-based upload**

✅ **Real-time validation and preview**

✅ **Production-ready**

---

**Ready to use!** Start importing your CSV files at: https://app.litebitefoods.com/checklists
