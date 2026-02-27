# Backend API

RESTful API server for the Restaurant Audit & Checklist application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (optional for local development):
```env
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
# Optional report generation tuning (milliseconds)
ENHANCED_PDF_TIMEOUT_MS=15000
REPORT_DATA_TIMEOUT_MS=10000
```

### Production environment

Use `backend/.env.production.example` as the baseline for production settings (or mirror these values in your hosting platform app settings).

Before deploying, run:

```bash
npm run env:check:prod
```

This validates production requirements such as:
- `JWT_SECRET` present and strong (non-placeholder, minimum length)
- database settings present for selected DB type
- report timeout env values are valid positive integers
- key production hardening flags (`ALLOWED_ORIGINS`, `TRUST_PROXY`, `FORCE_HTTPS`)

3. Create data directory:
```bash
mkdir data
```

4. Start server:
```bash
npm start
# or
npm run dev  # with nodemon for auto-reload
```

## API Documentation

### Authentication Endpoints

#### Register
- **POST** `/api/auth/register`
- Body: `{ email, password, name }`
- Returns: `{ token, user }`

#### Login
- **POST** `/api/auth/login`
- Body: `{ email, password }`
- Returns: `{ token, user }`

#### Get Current User
- **GET** `/api/auth/me`
- Headers: `Authorization: Bearer <token>`
- Returns: `{ user }`

### Checklist Endpoints

#### Get All Templates
- **GET** `/api/checklists`
- Headers: `Authorization: Bearer <token>`
- Returns: `{ templates: [...] }`

#### Get Template with Items
- **GET** `/api/checklists/:id`
- Headers: `Authorization: Bearer <token>`
- Returns: `{ template, items: [...] }`

#### Create Template
- **POST** `/api/checklists`
- Headers: `Authorization: Bearer <token>`
- Body: `{ name, category, description, items: [...] }`
- Returns: `{ id, message }`

### Audit Endpoints

#### Get All Audits
- **GET** `/api/audits`
- Headers: `Authorization: Bearer <token>`
- Returns: `{ audits: [...] }`

#### Get Audit Details
- **GET** `/api/audits/:id`
- Headers: `Authorization: Bearer <token>`
- Returns: `{ audit, items: [...] }`

#### Create Audit
- **POST** `/api/audits`
- Headers: `Authorization: Bearer <token>`
- Body: `{ template_id, restaurant_name, location, notes }`
- Returns: `{ id, message }`

#### Update Audit Item
- **PUT** `/api/audits/:auditId/items/:itemId`
- Headers: `Authorization: Bearer <token>`
- Body: `{ status, comment, photo_url }`
- Returns: `{ message }`

#### Complete Audit
- **PUT** `/api/audits/:id/complete`
- Headers: `Authorization: Bearer <token>`
- Returns: `{ message, score }`

### Report Endpoints

#### Get Audit Report Data (JSON)
- **GET** `/api/reports/audit/:id/report`
- Headers: `Authorization: Bearer <token>`
- Returns: summary, category scoring, detailed sections, action plan, and tracking data
- Notes:
  - Returns `400` for invalid audit id
  - Returns `404` for missing/inaccessible audit
  - Returns `409` when audit is not completed
  - Returns `504` when report generation exceeds `REPORT_DATA_TIMEOUT_MS`

#### Download Enhanced Audit PDF
- **GET** `/api/reports/audit/:id/enhanced-pdf`
- Headers: `Authorization: Bearer <token>`
- Query params:
  - `photos=true|false`
  - `comments=true|false` (default: `true`)
- Notes:
  - Returns `400` for invalid audit id
  - Returns `404` for missing/inaccessible audit
  - Returns `504` when PDF generation exceeds `ENHANCED_PDF_TIMEOUT_MS`

#### Download Legacy Audit PDF (Fallback)
- **GET** `/api/reports/audit/:id/pdf`
- Headers: `Authorization: Bearer <token>`
- Notes:
  - Kept for compatibility and fallback when enhanced PDF times out/fails

#### Get Top-3 Deviations
- **GET** `/api/reports/audit/:id/deviations`
- Headers: `Authorization: Bearer <token>`
- Query params:
  - `all=true` to include full deviations list in addition to top 3
- Returns: `total_deviations`, `top_3_deviations`

## Database Schema

- **users**: User accounts
- **checklist_templates**: Template definitions
- **checklist_items**: Items within templates
- **audits**: Audit instances
- **audit_items**: Individual item responses in audits

## Status Values

- `pending`: Not yet checked
- `completed`: Passed/Completed
- `failed`: Failed/Not compliant
- `warning`: Needs attention

