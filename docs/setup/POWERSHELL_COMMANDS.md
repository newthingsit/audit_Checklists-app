# PowerShell Commands Guide

Since you're using PowerShell on Windows, here are the correct commands (PowerShell doesn't support `&&`):

## Backend Setup

```powershell
cd backend
npm install
npm start
```

Or use the script:
```powershell
.\start-backend.ps1
```

## Web Setup

```powershell
cd web
npm install
npm start
```

Or use the script:
```powershell
.\start-web.ps1
```

## Mobile Setup

```powershell
cd mobile
npm install
npm start
```

Or use the script:
```powershell
.\start-mobile.ps1
```

## Alternative: Using Semicolon

You can chain commands with semicolons (but they run regardless of success):

```powershell
cd backend; npm install; npm start
```

## Conditional Execution

If you want the next command to only run if the previous succeeded:

```powershell
cd backend
if ($?) { npm install }
if ($?) { npm start }
```

Or using exit codes:

```powershell
cd backend
npm install
if ($LASTEXITCODE -eq 0) { npm start }
```

## Running Multiple Servers

Open separate PowerShell windows/terminals for each:
1. Terminal 1: Backend server
2. Terminal 2: Web app
3. Terminal 3: Mobile app (if needed)

## Quick Start (All in One)

For a quick test, you can run backend and web in separate terminals:

**Terminal 1 (Backend):**
```powershell
cd D:\audit_Checklists-app\backend
npm start
```

**Terminal 2 (Web):**
```powershell
cd D:\audit_Checklists-app\web
npm start
```

