# Monthly Scorecard Report Feature

## Overview

The Monthly Scorecard Report provides comprehensive analytics and insights for audit performance on a monthly basis. This feature helps track audit trends, identify areas for improvement, and generate executive reports.

## Features

### 1. **Monthly Statistics Dashboard**
- Total audits conducted in the month
- Completed vs in-progress audits
- Average score calculation
- Completion rate percentage
- Min/Max score tracking

### 2. **Performance Breakdowns**
- **By Template**: Performance metrics grouped by checklist template
- **By Location**: Performance metrics grouped by location
- **Daily Breakdown**: Day-by-day audit count and average scores

### 3. **Visual Analytics**
- Bar charts showing daily audit counts
- Line charts displaying average score trends
- Tables with detailed breakdowns

### 4. **Export Functionality**
- PDF export of monthly scorecard
- Professional formatted reports
- Includes summary and detailed audit list

### 5. **Filtering Options**
- Filter by year and month
- Optional location filter
- Real-time data updates

## API Endpoints

### Get Monthly Scorecard
```
GET /api/reports/monthly-scorecard?year=2024&month=1&location_id=1
```

**Response:**
```json
{
  "period": {
    "year": 2024,
    "month": 1,
    "monthName": "January"
  },
  "summary": {
    "totalAudits": 25,
    "completedAudits": 20,
    "inProgressAudits": 5,
    "avgScore": 85.5,
    "minScore": 65,
    "maxScore": 98,
    "completionRate": 80
  },
  "byTemplate": [...],
  "byLocation": [...],
  "dailyBreakdown": [...],
  "audits": [...]
}
```

### Export PDF
```
GET /api/reports/monthly-scorecard/pdf?year=2024&month=1&location_id=1
```

## Frontend

### Access
- Navigate to "Monthly Scorecard" in the sidebar menu
- URL: `/scorecard`

### Features
- Month/Year selector
- Location filter dropdown
- Interactive charts and tables
- PDF export button
- Real-time data refresh

## Usage

1. **View Monthly Scorecard:**
   - Go to Monthly Scorecard page
   - Select year and month
   - Optionally filter by location
   - View summary statistics and breakdowns

2. **Export Report:**
   - Click "Export PDF" button
   - PDF will download with all scorecard data

3. **Analyze Trends:**
   - Review daily breakdown charts
   - Compare performance by template
   - Compare performance by location
   - Identify improvement areas

## Technical Details

### Backend
- **File**: `backend/routes/reports.js`
- **Endpoints**: 
  - `GET /api/reports/monthly-scorecard`
  - `GET /api/reports/monthly-scorecard/pdf`

### Frontend
- **File**: `web/src/pages/MonthlyScorecard.js`
- **Dependencies**: 
  - Material-UI components
  - Recharts for visualization
  - Axios for API calls

### Database Queries
- Filters audits by year and month
- Groups data by template, location, and date
- Calculates statistics and averages
- Supports optional location filtering

## Future Enhancements

- [ ] Quarterly and yearly scorecards
- [ ] Comparison with previous periods
- [ ] Trend analysis over multiple months
- [ ] Email scheduling for monthly reports
- [ ] Custom date range selection
- [ ] Export to Excel format

