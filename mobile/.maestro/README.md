# Maestro Mobile E2E

## Prereqs
- Install Maestro: https://maestro.mobile.dev/
- Ensure the app is running or installed (Expo Go or standalone build).
- Enable the E2E helper in Expo:
  - EXPO_PUBLIC_E2E=true
  - EXPO_PUBLIC_E2E_MODE=true (required to unlock test-only helpers)

## Environment variables
Set these before running Maestro:
- APP_ID
  - Expo Go (dev): host.exp.exponent
  - Android standalone: your appId (e.g. com.company.audit)
  - iOS standalone: your bundle id
- E2E_EMAIL
- E2E_PASSWORD
- CHECKLIST_NAME

## Run
From mobile/:
- maestro test .maestro/flows/audit-full.yaml
- maestro test .maestro/flows/audit-save-resume.yaml

## Preflight (CI + local)
Run API/checklist validation before Maestro:
- node scripts/e2e/preflight.js --checklist "New QA – CDR"

## Notes
- The flows rely on testIDs added in the mobile app.
- The E2E autofill buttons only appear when EXPO_PUBLIC_E2E=true, EXPO_PUBLIC_E2E_MODE=true, and __DEV__ is true.
