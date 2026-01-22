# Storewise PDF Report Implementation

## ✅ New Endpoint Created

**Endpoint:** `GET /api/reports/storewise/pdf`

**Description:** Generates a PDF report grouping audits by store/location, similar to "CVR 2 (CDR) Plan - Report Storewise.pdf" format.

## 📋 Report Format

The PDF report includes:

### 1. Header Section
- Report title: `[Template Name] - Report Storewise`
- Company name: "Lite Bite Foods"
- Date range (if provided)

### 2. Summary Section
- Total Stores
- Total Audits
- Completed Audits
- In Progress Audits
- Overall Average Score

### 3. Store-wise Details
For each store:
- **Store Information:**
  - Store Name
  - Store Number
  - Address
  - City, State

- **Store Statistics:**
  - Total Audits
  - Completed Audits
  - In Progress Audits
  - Average Score
  - Min Score
  - Max Score
  - Completion Rate

- **Individual Audit Details:**
  - Template Name
  - Audit Date
  - Status
  - Score
  - Auditor Name
  - (Shows up to 5 audits per store)

## 🔧 Query Parameters

- `date_from` (optional): Start date filter (YYYY-MM-DD)
- `date_to` (optional): End date filter (YYYY-MM-DD)
- `template_id` (optional): Filter by specific template

## 📝 Usage Examples

### Get all stores report:
```
GET /api/reports/storewise/pdf
```

### Get report for specific date range:
```
GET /api/reports/storewise/pdf?date_from=2024-01-01&date_to=2024-12-31
```

### Get report for specific template:
```
GET /api/reports/storewise/pdf?template_id=123
```

### Combined filters:
```
GET /api/reports/storewise/pdf?date_from=2024-01-01&date_to=2024-12-31&template_id=123
```

## 🔐 Authentication

- Requires authentication
- Admins see all audits
- Regular users see only their audits

## 📄 PDF Features

- A4 size format
- Pagination with page numbers
- Footer: "Powered By Accrue"
- Organized by store number, then store name
- Clean, readable format

## 🎯 Next Steps

If you need to adjust the format to match the exact layout of "CVR 2 (CDR) Plan - Report Storewise.pdf", please provide details about:
1. Specific sections/layout you want
2. Additional data fields needed
3. Different grouping or sorting requirements
4. Table format vs. current format

The endpoint is ready to use and can be customized based on your requirements!
