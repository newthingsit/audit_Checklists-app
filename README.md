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
- **Recurring Failures Dashboard**: Track and highlight recurring audit failures
- **Location Verification**: GPS-based store verification
- **Scheduled Audits**: Automated audit scheduling and reminders

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
- Node.js & Express.js
- SQL Server (Azure) / SQLite (local)
- JWT Authentication
- bcryptjs

### Web Frontend
- React
- Material-UI
- React Router
- Axios
- Recharts (Analytics)

### Mobile App
- React Native & Expo
- React Navigation
- React Native Paper
- Axios

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- For mobile: Expo CLI and Expo Go app

### Quick Start

1. **Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Web**:
   ```bash
   cd web
   npm install
   npm start
   ```

3. **Mobile**:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```

## Live Deployment

- **Web App**: [https://app.litebitefoods.com](https://app.litebitefoods.com)
- **Backend API**: Azure App Service / Cloud Foundry
- **Mobile**: Expo OTA updates (production branch)

### Cloud Foundry Deployment

Deploy to Cloud Foundry using the provided scripts and configuration:

```bash
# Quick deployment (interactive)
./deploy-to-cf.sh

# Or manual deployment:
# Backend
cd backend && cf push --vars-file vars.yml

# Web
cd web && npm run build && cf push
```

📚 **Deployment Documentation:**
- [Cloud Foundry Deployment Guide](./CLOUD_FOUNDRY_DEPLOYMENT.md) - Complete step-by-step guide
- [Pre-Deployment Checklist](./CLOUD_FOUNDRY_CHECKLIST.md) - Verify readiness before deployment
- [Hosting Plan](./docs/deployment/HOSTING_PLAN.md) - Compare deployment options

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user

### Audits
- `GET /api/audits` - Get all audits
- `POST /api/audits` - Create new audit
- `GET /api/audits/:id` - Get audit details
- `PUT /api/audits/:id` - Update audit

### Analytics
- `GET /api/analytics/recurring-failures` - Recurring failures dashboard
- `GET /api/analytics/recurring-failures/trend` - Failure trends

## Documentation

See the [`docs/`](./docs/) directory for comprehensive documentation:

- [Setup Guides](./docs/setup/)
- [Feature Documentation](./docs/features/)
- [Deployment Guides](./docs/deployment/)
- [API Documentation](./docs/technical/)

## License

This project is proprietary software for Lite Bite Foods.
