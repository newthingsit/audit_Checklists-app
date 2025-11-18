# How to Start the Application - SIMPLE GUIDE

## ⚠️ IMPORTANT: Don't Run from Root!

**The root directory (`D:\audit_Checklists-app`) does NOT have a `package.json` file.**

You **MUST** run commands from the subdirectories:
- `backend/` - for the API server
- `web/` - for the React app

## ✅ Correct Way to Start

### Method 1: Use the Script (Easiest)
```powershell
.\start-services.ps1
```

### Method 2: Manual Start (Two Separate Terminals)

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - Web:**
```powershell
cd web
npm start
```

## 🔍 Check if Services Are Running

```powershell
# Check if ports are in use
Get-NetTCPConnection -LocalPort 5000,3000 -ErrorAction SilentlyContinue
```

If you see ports 5000 and 3000 listening, services are already running!

## 🌐 Access the App

Once services are running:
- **Web App**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🐛 Common Error

**Error:** `Could not read package.json: Error: ENOENT: no such file or directory`

**Cause:** You ran `npm start` from the root directory

**Solution:** Always `cd` into `backend` or `web` first!

## ✅ Quick Test

Open browser and go to: http://localhost:3000

If you see the login page, everything is working!

