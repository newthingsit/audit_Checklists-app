Set-Location "d:\audit_Checklists-app"
Write-Host "=== Git Status ==="
git status
Write-Host ""
Write-Host "=== Git Diff Stats ==="
git diff --stat
Write-Host ""
Write-Host "=== Git Log (last 3) ==="
git log --oneline -3
