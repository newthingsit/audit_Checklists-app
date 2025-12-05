# PowerShell script to commit and push changes
Set-Location "d:\audit_Checklists-app"

# Stage all changes
git add -A

# Commit with message
git commit -m "Fix mobile app server error and add web app mobile responsiveness

Mobile App Fixes:
- Increase auto-refresh interval from 5s to 60s
- Add connection error banner instead of replacing content
- Preserve cached history data on errors
- Add exponential backoff retry
- Add global 401 handler for session expiration

Web App Mobile Responsiveness:
- Add comprehensive mobile CSS for Safari/Chrome
- Touch-friendly tap targets (44px min)
- Mobile form styles with full-width radio buttons
- Fixed bottom action bar for audit forms
- Responsive stepper (vertical on mobile)
- Sticky progress bar on audit checklist
- Camera capture support for mobile photos"

# Push to origin master
git push origin master

Write-Host "Done!"
