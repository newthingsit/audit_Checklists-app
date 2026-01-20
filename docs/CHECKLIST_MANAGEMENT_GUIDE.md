# Checklist Management Guide

This guide explains how to add, edit, and structure checklist templates (CSV import) for both web and mobile.

## Quick Start (Web UI)
1. Log in as an admin.
2. Go to **Checklists**.
3. Click **Import CSV**.
4. Provide **Template name** and upload your CSV.
5. Import and verify categories, sections, and input types.

## Quick Start (API)
```
POST /api/checklists/import/csv
Content-Type: application/json

{
  "templateName": "CVR 3 – (CDR) Plan",
  "category": "CDR",
  "description": "CVR 3 checklist",
  "csvData": "<raw CSV text>"
}
```

## CSV Columns (Recommended)
Use these headers (case-insensitive):
- `title` (required)
- `description`
- `category`
- `subcategory`
- `section`
- `input_type`
- `required`
- `weight`
- `is_critical`
- `options`

## Input Types
Common values:
- `auto` (Yes/No/NA options)
- `short_answer` (single line text)
- `long_answer` (multi-line text)
- `open_ended` (multi-line text)
- `number`
- `date`
- `time`
- `scan_code`
- `signature`
- `option_select`, `single_answer`, `multiple_answer`, `dropdown`

## Options Format
Use `options` when the item is a choice field.
Format:
```
Yes:3|No:0|Not Applicable:NA
```

## Sections and Grouping
To group items in Speed of Service (Trnx-1, Trnx-2, Avg), set:
- `category`: `SPEED OF SERVICE - TRACKING`
- `section`: `Trnx-1`, `Trnx-2`, `Trnx-3`, `Trnx-4`, `Avg`

Sections are rendered as collapsible headers in the audit form.

## Editing an Existing Template (Safe Approach)
1. Export or copy the original CSV.
2. Make changes in a new CSV file.
3. Import with a **new template name** (recommended to avoid changing old audits).
4. Update schedules or assignments to use the new template.

## CVR/CDR Acknowledgement Rules
For ACKNOWLEDGEMENT items:
- **Manager on Duty** -> `short_answer`
- **Signature** -> `signature`

These should not have Yes/No/NA options.

## Validation Tips
- Ensure every row has a `category`.
- Use `section` only when you want collapsible groups.
- Keep `input_type` explicit for non-option fields.

## Troubleshooting
- If fields show Yes/No/NA unexpectedly, check `input_type` and `options`.
- If sections are missing, verify the `section` column is populated.
