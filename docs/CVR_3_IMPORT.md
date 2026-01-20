# CVR 3 – (CDR) Plan - Checklist Import

## Import the CVR 3 Checklist via CSV

Use the **CVR_3_CDR_Plan.csv** file in the project root to create the "CVR 3 – (CDR) Plan" template.

### Option 1: Web UI (Admin)

1. Log in as an admin.
2. Go to **Checklists** or **Templates**.
3. Use **Import CSV**.
4. Set **Template name:** `CVR 3 – (CDR) Plan`
5. Upload `CVR_3_CDR_Plan.csv`.
6. Complete the import.

### Option 2: API

```http
POST /api/checklists/import/csv
Content-Type: multipart/form-data

templateName: CVR 3 – (CDR) Plan
category: CDR
file: <CVR_3_CDR_Plan.csv>
```

### CSV Structure

- **Categories:** QUALITY, SERVICE, HYGIENE AND CLEANLINESS, PROCESSES, ACKNOWLEDGEMENT  
- **Subcategories:** entrance, Restaurant, Accuracy, Delivery Service, Technology, Speed of Service, Entrance, FOH, Bar and Service area, Restroom / Washroom, etc.
- **Input types:** `auto` (Yes/No/NA), `short_answer`, `number`, `signature`
- **Acknowledgement:** Manager on Duty (`short_answer`), Signature (`signature`)

### After Import

- The template appears in **Checklists** in the mobile app and web.
- Use it to create audits; the CVR-style dark UI will be used when the template name contains "CVR" or "CDR Plan".
