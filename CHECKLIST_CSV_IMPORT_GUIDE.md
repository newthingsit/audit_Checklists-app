# Checklist CSV Import Guide

**Last Updated:** January 30, 2026  
**Version:** 2.0 (Enhanced)

---

## Quick Start

### Basic Import

```bash
cd backend
node scripts/import-csv-checklist.js --file ../CVR_CDR_Checklist_checklist.csv --name "CVR - CDR Checklist"
```

### Import with Description

```bash
node scripts/import-csv-checklist.js \
  --file ../CVR_CDR_Checklist_checklist.csv \
  --name "CVR - CDR Checklist" \
  --description "Customer Visitor Review - Customer Delight Review" \
  --category "CDR"
```

### Overwrite Existing Template

```bash
node scripts/import-csv-checklist.js \
  --file ../my-checklist.csv \
  --name "My Checklist" \
  --overwrite
```

---

## CSV File Format

### Column Requirements

#### Required Columns

- **title** - Item title or description (primary column)

#### Optional Columns

| Column | Alternative Names | Values | Purpose |
| --- | --- | --- | --- |
| description | desc, detail | Free text | Detailed explanation of the item |
| category | cat, group | Text (e.g., QUALITY, SERVICE, HYGIENE) | Main category grouping |
| subcategory | subcat, sub_category | Text | Secondary grouping |
| section | sec | Text | Section or subsection |
| input_type | type, field_type, input | See Input Types below | Type of user input |
| required | req | yes/no, true/false, 1/0 | Is item required? |
| weight | priority | 1-3 (number) | Item importance (affects scoring) |
| is_critical | critical, critical_flag | yes/no, true/false, 1/0 | Is this a critical item? |
| options | choices, answers | Formatted string | Answer options |

### Input Types

```text
- option_select      (Yes/No/NA dropdown)
- short_answer       (Text input, ~50 chars)
- long_answer        (Text area, multiline)
- number             (Numeric input)
- date               (Date picker)
- signature          (Signature capture)
- scan_code          (Barcode/QR scanner)
- time               (Time picker)
- multiple_answer    (Checkboxes/multiple select)
- grid               (Matrix/grid input)
- description        (Long text field)
- open_ended         (Free text)
- select_from_data_source (Dropdown from database)
```

### Options Format

Options define the possible answers and their scores. Format: `Label:Score|Label:Score`

**Examples:**

```text
Yes:3|No:0|NA:NA           (Pass/Fail with N/A)
Pass:100|Fail:0            (Numeric scoring)
Excellent:3|Good:2|Poor:0  (3-level rating)
```

---

## Examples

### Example 1: Basic Checklist

**my-checklist.csv:**

```csv
title,category,input_type,required,options
Is the food fresh?,QUALITY,option_select,yes,Yes:3|No:0|NA:NA
Staff greeting,SERVICE,option_select,yes,Yes:3|No:0|NA:NA
Floor is clean,HYGIENE,option_select,yes,Yes:1|No:0|NA:NA
```

**Import Command:**

```bash
node scripts/import-csv-checklist.js \
  --file my-checklist.csv \
  --name "Basic Quality Audit"
```

---

### Example 2: Detailed Checklist with All Fields

**detailed-checklist.csv:**

```csv
title,description,category,subcategory,input_type,required,weight,is_critical,options
Food served at the right temperature,Verify hot food is above 65°C and cold food below 5°C,QUALITY,Temperature,option_select,yes,3,yes,Yes:3|No:0|NA:NA
Staff appearance,Check uniform is clean and name tag visible,SERVICE,Entrance,option_select,yes,2,no,Yes:2|No:0|NA:NA
Floor cleanliness,Floor should be free of spills and debris,HYGIENE,FOH,option_select,yes,1,no,Yes:1|No:0|NA:NA
Customer wait time,Measure time from entrance to seating,SERVICE,Speed of Service,number,yes,2,yes,
Special instructions,Any special notes or observations,SERVICE,General,long_answer,no,1,no,
```

**Import Command:**

```bash
node scripts/import-csv-checklist.js \
  --file detailed-checklist.csv \
  --name "Comprehensive Store Audit" \
  --description "Full store audit including quality, service, and hygiene" \
  --category "CDR"
```

---

### Example 3: Speed of Service Audit

**speed-of-service.csv:**

```csv
title,description,category,subcategory,section,input_type,required,weight
Table Number,Enter the table number,SERVICE,Speed of Service,Trnx-1,short_answer,yes,1
Dish Name,Enter the name of the dish,SERVICE,Speed of Service,Trnx-1,short_answer,yes,1
Time - Attempt 1,Time in minutes (1st measurement),SERVICE,Speed of Service,Trnx-1,number,yes,1
Time - Attempt 2,Time in minutes (2nd measurement),SERVICE,Speed of Service,Trnx-1,number,yes,1
Time - Attempt 3,Time in minutes (3rd measurement),SERVICE,Speed of Service,Trnx-1,number,yes,1
Time - Attempt 4,Time in minutes (4th measurement),SERVICE,Speed of Service,Trnx-1,number,yes,1
Time - Attempt 5,Time in minutes (5th measurement),SERVICE,Speed of Service,Trnx-1,number,yes,1
```

**Import Command:**

```bash
node scripts/import-csv-checklist.js \
  --file speed-of-service.csv \
  --name "Speed of Service - Transaction 1" \
  --category "SERVICE"
```

---

## Column Detection Logic

The script uses **flexible column name matching** to find columns:

### Title Column Detection

Searches for: `title`, `item_name`, `item`, `description`

- Uses first match found
- Required for import to work

### Category Column Detection

Searches for: `category`, `cat`, `group`

### Input Type Column Detection

Searches for: `input_type`, `type`, `field_type`, `input`

- Defaults to `option_select` if not found

### Example - Alternative Column Names

This CSV will work the same as standard format:

```csv
Item Name,Description,Group,Sub Group,Field Type,Is Required,Priority,Answers
Food Temperature,,QUALITY,Temperature,option_select,yes,1,Yes:3|No:0|NA:NA
Staff Greeting,Warm welcome provided,SERVICE,Entrance,option_select,yes,2,Yes:3|No:0|NA:NA
```

---

## Command Line Options

### Required Arguments

```bash
--file <path>        Path to CSV file
--name <name>        Template name to create
```

### Optional Arguments

```bash
--description <text>  Template description
--category <cat>      Template category (defaults to "General")
--overwrite           Overwrite existing template with same name
```

### Environment Variables (Alternative)

```bash
CSV_FILE="path/to/file.csv"
TEMPLATE_NAME="My Checklist"
TEMPLATE_DESC="Description"
TEMPLATE_CATEGORY="Category"
OVERWRITE=1
```

**Environment Variable Example:**

```bash
CSV_FILE=../CVR_CDR_Checklist_checklist.csv \
TEMPLATE_NAME="CVR - CDR Checklist" \
TEMPLATE_DESC="Customer Visitor Review" \
TEMPLATE_CATEGORY="CDR" \
node scripts/import-csv-checklist.js
```

---

## Best Practices

### 1. CSV Formatting

- ✅ Use proper comma separation
- ✅ Quote fields containing commas: `"Field with, comma"`
- ✅ Consistent value types (yes/no, not yes/false mix)
- ✅ No extra whitespace in headers

### 2. Data Quality

- ✅ Unique item titles (within category)
- ✅ Proper input_type selection
- ✅ Valid options format: `Label:Score|Label:Score`
- ✅ Weight values 1-3 (1=low, 2=medium, 3=high)
- ✅ Category consistency (use same category names throughout)

### 3. Item Organization

- ✅ Group related items in same category/subcategory
- ✅ Use section field for further organization
- ✅ Mark critical items (food safety, compliance)
- ✅ Set weight appropriate to importance

### 4. Testing

- ✅ Start with small pilot CSV (5-10 items)
- ✅ Test with CLI args first: `--file`, `--name`
- ✅ Verify in mobile app before full deployment
- ✅ Use `--overwrite` flag only when updating existing

---

## Troubleshooting

### Error: "CSV file not found"

```text
Solution: Verify file path is correct
- Use absolute path: C:\path\to\file.csv
- Or relative path from backend/: ../path/to/file.csv
```

### Error: "CSV must have a 'title' column"

```text
Solution: Ensure CSV has a column named:
  - "title" (recommended)
  - "item_name" (alternative)
  - "item" (alternative)
  - Or use descriptive column name
```

### Error: "Template already exists"

```text
Solution 1: Use different template name
Solution 2: Add --overwrite flag to replace
  node scripts/import-csv-checklist.js \
    --file checklist.csv \
    --name "My Template" \
    --overwrite
```

### Items Not Appearing in App

```text
Checklist:
1. Verify import completed with "✅ IMPORT COMPLETE"
2. Check template count in results
3. Restart backend server (if running locally)
4. Refresh mobile app
5. Check browser console for errors
```

### Wrong Number of Items Imported

```text
Causes:
- Empty rows in CSV (skipped automatically)
- Rows with missing title (skipped)
- Encoding issues (use UTF-8)

Solution:
- Open CSV in Excel
- Remove extra blank rows
- Verify all rows have titles
- Save as CSV (UTF-8)
```

---

## Advanced Features

### Batch Import Multiple Checklists

Create a shell script (`import-all.sh`):

```bash
#!/bin/bash

# Import CVR - CDR
node scripts/import-csv-checklist.js \
  --file ../CVR_CDR_Checklist_checklist.csv \
  --name "CVR - CDR Checklist" \
  --category "CDR"

# Import CVR - QSR
node scripts/import-csv-checklist.js \
  --file ../CVR_QSR_checklist.csv \
  --name "CVR - QSR Checklist" \
  --category "QSR"

echo "✅ All checklists imported!"
```

Run with:

```bash
chmod +x import-all.sh
./import-all.sh
```

---

### Creating CSV from Spreadsheet

#### From Excel/Google Sheets

1. Open your spreadsheet
2. Click File → Download → CSV (Comma Separated Values)
3. Save the file
4. Use with import script

#### From Google Sheets Online

```text
File → Download → Comma Separated Values (.csv)
```

---

### Template Cloning

To create variations of existing template:

1. Export existing template items to CSV (using SQL query)
2. Modify CSV as needed
3. Import with new name:

```bash
node scripts/import-csv-checklist.js \
  --file modified-template.csv \
  --name "New Template Variant"
```

---

## SQL Export (For Reference)

If you need to export existing template to CSV:

```sql
SELECT 
  title, description, category, subcategory, section,
  input_type, required, weight, is_critical, options
FROM checklist_items
WHERE template_id = 43
ORDER BY order_index
```

Then copy to Excel and save as CSV.

---

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review CSV format requirements
3. Verify column names are recognized
4. Check backend logs for detailed errors

---

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 2.0 | 2026-01-30 | Enhanced script with better documentation, flexible column detection, improved error handling |
| 1.0 | 2026-01-20 | Initial import script |

---

## Examples Directory

CSV examples available in:

- `CVR_CDR_Checklist_checklist.csv` - Full CVR-CDR checklist (252 items)
- `CVR_QSR_checklist.csv` - QSR variant (174 items)
- `comprehensive-checklist-template.csv` - Template example
- `checklist-template-sample.csv` - Sample template
