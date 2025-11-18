# Service Restart Guide

## Services Restarted

Both backend and frontend services have been restarted.

### Backend Server
- **Status**: ✅ Running
- **Port**: 5000
- **Location**: `D:\audit_Checklists-app\backend`
- **Command**: `npm start`
- **URL**: http://localhost:5000

### Frontend Server
- **Status**: ✅ Running
- **Port**: 3000
- **Location**: `D:\audit_Checklists-app\web`
- **Command**: `npm start`
- **URL**: http://localhost:3000

## How to Access

1. **Frontend Application**: Open your browser and go to http://localhost:3000
2. **Backend API**: API endpoints are available at http://localhost:5000/api

## Features Available

After restart, all new features are available:
- ✅ Dark mode toggle
- ✅ Photo upload in audit forms
- ✅ Scheduled audits
- ✅ Enhanced form validation
- ✅ Export options menu
- ✅ Keyboard shortcuts
- ✅ Enhanced search and filters

## Troubleshooting

If services don't start:
1. Check if ports 3000 and 5000 are available
2. Verify Node.js is installed: `node --version`
3. Check for errors in the terminal
4. Ensure dependencies are installed: `npm install` in both directories

## Manual Restart Commands

### Stop Services
```powershell
Get-Process -Name node | Stop-Process -Force
```

### Start Backend
```powershell
cd D:\audit_Checklists-app\backend
npm start
```

### Start Frontend
```powershell
cd D:\audit_Checklists-app\web
npm start
```

