# PowerShell script to start the backend server
cd backend
npm install
if ($LASTEXITCODE -eq 0) {
    npm start
} else {
    Write-Host "npm install failed. Please check the errors above."
}

