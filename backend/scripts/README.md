# Scripts

## Create QA Audit - CDR Plan Template

This script creates the QA Audit - CDR Plan checklist template in the database.

### Usage

```bash
cd backend
node scripts/create-qa-audit-template.js
```

### What it does

- Creates a new checklist template named "QA Audit - CDR Plan"
- Category: "Quality Assurance"
- Adds 24 checklist items organized into 6 categories:
  - Customer Data Management (4 items)
  - Process Compliance (4 items)
  - Quality Standards (4 items)
  - System and Tools (4 items)
  - Documentation and Reporting (4 items)
  - Risk Management (4 items)

### Notes

- The script checks if the template already exists before creating it
- If the template exists, it will not create a duplicate
- All items are marked as required by default

