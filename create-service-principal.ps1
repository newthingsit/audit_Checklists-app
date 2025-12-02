# Create Azure Service Principal for GitHub Actions
# Run this script in PowerShell (as Administrator if needed)

Write-Host "🔐 Creating Azure Service Principal for GitHub Actions..." -ForegroundColor Cyan

# Your subscription ID (from az login output)
$subscriptionId = "d221f54b-9cf2-4308-a1f3-9dfbe7e7fb15"

# Resource group name (update if different)
$resourceGroup = "audit-app-rg"

# Service Principal name
$spName = "audit-app-github-actions"

Write-Host "`n📋 Details:" -ForegroundColor Yellow
Write-Host "  Subscription: $subscriptionId"
Write-Host "  Resource Group: $resourceGroup"
Write-Host "  Service Principal: $spName"
Write-Host ""

# Create Service Principal
Write-Host "⏳ Creating Service Principal..." -ForegroundColor Yellow
$sp = az ad sp create-for-rbac `
    --name $spName `
    --role contributor `
    --scopes "/subscriptions/$subscriptionId/resourceGroups/$resourceGroup" `
    --sdk-auth `
    --output json

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Service Principal created successfully!" -ForegroundColor Green
    Write-Host "`n📋 Copy this JSON and add it to GitHub Secrets as 'AZURE_CREDENTIALS':" -ForegroundColor Cyan
    Write-Host "`n$sp`n" -ForegroundColor White
    
    # Save to file
    $sp | Out-File -FilePath "azure-credentials.json" -Encoding utf8
    Write-Host "💾 Also saved to: azure-credentials.json" -ForegroundColor Green
    Write-Host "`n⚠️  IMPORTANT: Delete azure-credentials.json after adding to GitHub Secrets!" -ForegroundColor Red
} else {
    Write-Host "`n❌ Failed to create Service Principal. Error code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "`nTry running manually:" -ForegroundColor Yellow
    Write-Host "  az ad sp create-for-rbac --name $spName --role contributor --scopes /subscriptions/$subscriptionId/resourceGroups/$resourceGroup --sdk-auth" -ForegroundColor White
}

