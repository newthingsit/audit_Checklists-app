# Backend API

RESTful API server for the Restaurant Audit & Checklist application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (optional):
```env
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
```

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

