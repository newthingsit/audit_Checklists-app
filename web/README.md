# Web Application

React-based web application for Restaurant Audit & Checklist management.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

The app will open at `http://localhost:3000`

## Features

- Responsive Material-UI design
- User authentication
- Dashboard with statistics
- Checklist template selection
- Interactive audit forms
- Audit history and search
- Real-time progress tracking

## Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

## Configuration

The app is configured to proxy API requests to `http://localhost:5000` during development. Update the proxy in `package.json` if your backend runs on a different port.

