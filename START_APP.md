# How to Start the Application

## Quick Start

### Option 1: Use the PowerShell Script (Recommended)
```powershell
.\start-services.ps1
```

This will open both services in separate PowerShell windows.

### Option 2: Manual Start

#### Start Backend (Terminal 1)
```powershell
cd backend
npm start
```

#### Start Web Frontend (Terminal 2)
```powershell
cd web
npm start
```

## Important Notes

⚠️ **DO NOT run `npm start` from the root directory!**

The root directory (`D:\audit_Checklists-app`) does NOT have a `package.json` file.

You must run commands from:
- `backend/` directory for the API server
- `web/` directory for the React app

## Service URLs

Once started:
- **Backend API**: http://localhost:5000
- **Web App**: http://localhost:3000

## Default Login

- **Email**: `admin@test.com` or `admin@example.com`
- **Password**: `admin123`

## Troubleshooting

### If services don't start:
1. Make sure you're in the correct directory (`backend` or `web`)
2. Check if Node.js is installed: `node --version`
3. Install dependencies: `npm install`
4. Check if ports 3000 and 5000 are available

### If you see "port already in use":
```powershell
# Find and kill processes using the ports
Get-NetTCPConnection -LocalPort 3000,5000 | Select-Object OwningProcess | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

## Development Mode

For auto-reload during development:

**Backend:**
```powershell
cd backend
npm run dev
```

**Web:**
```powershell
cd web
npm start
```
(React already has hot reload enabled)

