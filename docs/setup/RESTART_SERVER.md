# How to Restart the Backend Server

## Quick Method (PowerShell)

### Step 1: Stop the Current Server

**Option A: Find and Kill Process**
```powershell
# Find the process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with the number from above)
taskkill /PID <PID_NUMBER> /F
```

**Option B: One-Line Command**
```powershell
# Find and kill process on port 5000 in one command
$port = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($port) { Stop-Process -Id $port.OwningProcess -Force }
```

### Step 2: Start the Server

```powershell
cd backend
npm start
```

## Complete Restart Script

Create a file `restart-backend.ps1`:

```powershell
# Stop existing server
$port = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($port) { 
    Write-Host "Stopping server on port 5000..."
    Stop-Process -Id $port.OwningProcess -Force
    Start-Sleep -Seconds 2
}

# Start server
Write-Host "Starting backend server..."
cd backend
npm start
```

Then run:
```powershell
.\restart-backend.ps1
```

## Alternative: Using Nodemon (Auto-Restart)

If you want the server to automatically restart on file changes:

```powershell
cd backend
npm run dev
```

This uses `nodemon` which watches for file changes and restarts automatically.

## Verify Server is Running

After starting, check:
1. Open browser: `http://localhost:5000/api/health`
2. Should see: `{"status":"OK","message":"Server is running"}`
3. Check terminal for: "Server running on port 5000"

## Troubleshooting

### Port Already in Use
If you get "EADDRINUSE" error:
```powershell
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill it
taskkill /PID <PID> /F
```

### Server Won't Start
1. Check if Node.js is installed: `node --version`
2. Check if dependencies are installed: `cd backend; npm install`
3. Check for errors in the terminal output

### Database Errors
If you see database errors:
1. Make sure `backend/data/` directory exists
2. Delete `backend/data/audit.db` to reset (WARNING: deletes all data)
3. Restart server - it will recreate the database

