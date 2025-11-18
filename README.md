# Restaurant Audit & Checklist App

A comprehensive web and mobile application for conducting restaurant audits and checklists. This application helps restaurant managers and auditors track compliance, safety, and quality standards.

## Features

- **User Authentication**: Secure login and registration
- **Checklist Templates**: Pre-built templates for restaurant audits
- **Audit Management**: Create, track, and complete audits
- **Progress Tracking**: Real-time progress monitoring
- **Audit History**: View and search past audits
- **Multi-Platform**: Web, Android, and iOS support
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Project Structure

```
audit_Checklists-app/
├── backend/          # Node.js/Express API server
├── web/              # React web application
├── mobile/           # React Native mobile app (Android & iOS)
├── docs/             # Project documentation
│   ├── prd/          # Product Requirements Document
│   ├── features/     # Feature documentation
│   ├── technical/    # Technical fixes & API docs
│   ├── setup/        # Setup guides
│   └── credentials/  # Credentials & configuration
└── README.md
```

## Tech Stack

### Backend
- Node.js
- Express.js
- SQLite
- JWT Authentication
- bcryptjs

### Web Frontend
- React
- Material-UI
- React Router
- Axios

### Mobile App
- React Native
- Expo
- React Navigation
- React Native Paper
- Axios

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- For mobile: Expo CLI and Expo Go app on your device

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional, defaults are used):
```env
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
```

4. Create the data directory:
```bash
mkdir data
```

5. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The backend API will be running on `http://localhost:5000`

### Web Application Setup

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The web app will open at `http://localhost:3000`

### Mobile Application Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Update the API URL in `src/context/AuthContext.js`:
   - For Android emulator: `http://10.0.2.2:5000/api`
   - For iOS simulator: `http://localhost:5000/api`
   - For physical device: `http://YOUR_COMPUTER_IP:5000/api`

4. Start Expo:
```bash
npm start
```

5. Scan the QR code with:
   - **Android**: Expo Go app
   - **iOS**: Camera app (then open in Expo Go)

## Default Checklist Template

The application comes with a pre-configured "Restaurant Safety & Compliance" template that includes:

- **Food Safety**: Temperature checks, expiration dates, cross-contamination prevention
- **Cleanliness**: Kitchen, dining area, restroom, waste management
- **Equipment**: Cooking equipment, refrigeration, fire safety, ventilation
- **Staff**: Hygiene, training records, uniforms
- **Compliance**: Health permits, insurance, certifications

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Checklists
- `GET /api/checklists` - Get all checklist templates
- `GET /api/checklists/:id` - Get checklist template with items
- `POST /api/checklists` - Create new checklist template (protected)

### Audits
- `GET /api/audits` - Get all audits for current user (protected)
- `GET /api/audits/:id` - Get audit details (protected)
- `POST /api/audits` - Create new audit (protected)
- `PUT /api/audits/:auditId/items/:itemId` - Update audit item (protected)
- `PUT /api/audits/:id/complete` - Complete audit (protected)

### Templates
- `GET /api/templates` - Get all templates (protected)

## Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **Select Template**: Choose a checklist template from the templates page
3. **Start Audit**: Fill in restaurant information and begin the audit
4. **Complete Items**: Mark each checklist item as completed, failed, warning, or pending
5. **Save Audit**: Save your progress or complete the audit
6. **View History**: Access past audits from the history page

## Database

The application uses SQLite for data storage. The database file is created automatically in `backend/data/audit.db` on first run.

## Development

### Backend Development
- Uses nodemon for auto-reload during development
- Database schema is created automatically
- Default templates are seeded on first run

### Web Development
- Hot reload enabled
- Proxy configured to backend API
- Material-UI for consistent design

### Mobile Development
- Expo provides hot reload
- Works on both Android and iOS
- Use Expo Go for quick testing

## Production Deployment

### Backend
1. Set proper `JWT_SECRET` in `.env`
2. Use a production database (PostgreSQL recommended)
3. Set up proper CORS origins
4. Use process manager (PM2) for Node.js

### Web
1. Build the production bundle: `npm run build`
2. Serve static files with a web server (nginx, Apache)
3. Configure API proxy or CORS

### Mobile
1. Build standalone apps with Expo:
   ```bash
   expo build:android
   expo build:ios
   ```
2. Or use EAS Build for easier deployment

## Security Notes

- Change the default JWT_SECRET in production
- Use HTTPS in production
- Implement rate limiting
- Add input validation and sanitization
- Use environment variables for sensitive data
- Consider using a more robust database for production

## License

This project is open source and available for use.

## Documentation

Comprehensive project documentation is available in the [`docs/`](./docs/) directory:

- **[PRD (Product Requirements)](./docs/prd/)** - Product requirements, feature specifications, and planning
- **[Features](./docs/features/)** - Detailed feature documentation
- **[Technical](./docs/technical/)** - Technical fixes, API documentation, and troubleshooting
- **[Setup Guides](./docs/setup/)** - Setup and quickstart guides
- **[Deployment](./docs/deployment/)** - Hosting, deployment, and production setup guides
- **[Credentials](./docs/credentials/)** - Default credentials and login information

See [docs/README.md](./docs/README.md) for a complete documentation index.

## Deployment

Ready to deploy? Check out our deployment guides:

- **[Quick Deployment Guide](./docs/deployment/QUICK_DEPLOY.md)** - Get up and running in 30 minutes
- **[Comprehensive Hosting Plan](./docs/deployment/HOSTING_PLAN.md)** - Full hosting strategy and options

## Support

For issues or questions, please check the codebase or create an issue in the repository.

