# PowerShell script to start the web application
cd web
npm install
if ($LASTEXITCODE -eq 0) {
    npm start
} else {
    Write-Host "npm install failed. Please check the errors above."
}

