# PowerShell script to start both backend and web services
# Run this script to start the application

Write-Host "Starting Restaurant Audit Application..." -ForegroundColor Cyan
Write-Host ""

# Start Backend Server
Write-Host "Starting Backend Server on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm start" -WindowStyle Normal

# Wait a bit before starting web
Start-Sleep -Seconds 3

# Start Web Frontend
Write-Host "Starting Web Frontend on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\web'; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "Services are starting in separate windows..." -ForegroundColor Green
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Web App: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please wait 30-60 seconds for services to fully start." -ForegroundColor Yellow
Write-Host "Then open http://localhost:3000 in your browser." -ForegroundColor Green
Write-Host ""
Write-Host "Default Login:" -ForegroundColor White
Write-Host "  Email: admin@test.com" -ForegroundColor Gray
Write-Host "  Password: admin123" -ForegroundColor Gray

