# Check git status
$ErrorActionPreference = "Continue"
Set-Location "d:\audit_Checklists-app"

$statusOutput = & git status 2>&1
$statusOutput | Out-File "d:\audit_Checklists-app\git-output.txt" -Encoding UTF8

$diffOutput = & git diff --stat 2>&1
$diffOutput | Out-File "d:\audit_Checklists-app\git-output.txt" -Append -Encoding UTF8

$logOutput = & git log --oneline -3 2>&1
$logOutput | Out-File "d:\audit_Checklists-app\git-output.txt" -Append -Encoding UTF8
