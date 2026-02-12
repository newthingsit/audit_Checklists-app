# CI Secrets

This document lists the GitHub Actions secrets required for CI workflows.

## Required Secrets
- API_URL
  - Used by: [ci.yml](../.github/workflows/ci.yml), [mobile-maestro.yml](../.github/workflows/mobile-maestro.yml)
  - Purpose: Backend API base URL for tests and mobile app
- TEST_EMAIL
  - Used by: [mobile-maestro.yml](../.github/workflows/mobile-maestro.yml)
  - Purpose: Mobile E2E login username
- TEST_PASSWORD
  - Used by: [mobile-maestro.yml](../.github/workflows/mobile-maestro.yml)
  - Purpose: Mobile E2E login password
- TEST_STORE_ID or TEST_STORE_NAME
  - Used by: [mobile-maestro.yml](../.github/workflows/mobile-maestro.yml)
  - Purpose: Store selection (if needed for custom flows)

## Optional Secrets
- EXPO_TOKEN
  - Used by: optional mobile build steps (if added later)
- MAESTRO_CLOUD_API_KEY
  - Used by: optional Maestro Cloud runs (if enabled)
- MAESTRO_APP_ID
  - Used by: [mobile-maestro.yml](../.github/workflows/mobile-maestro.yml)
  - Purpose: Override app id (default uses Expo Go)
- TEST_CHECKLIST_NAME
  - Used by: [mobile-maestro.yml](../.github/workflows/mobile-maestro.yml)
  - Purpose: Checklist to run in Maestro (default: "New QA - CDR")

## Stability Recommendations
- Scheduled runs should point at a stable staging API for repeatability.
- Ensure checklist names exist in the target API before running Maestro.

## Test-Only Guard
- The mobile E2E helpers are enabled only when all of the following are true:
  - `__DEV__` build
  - `EXPO_PUBLIC_E2E=true`
  - `EXPO_PUBLIC_E2E_MODE=true`

Set these in CI workflow env (not secrets) when running Maestro.

## How to Add Secrets (GitHub UI)
1. Open the repository in GitHub.
2. Go to Settings -> Secrets and variables -> Actions.
3. Click New repository secret.
4. Add the secret name and value.
5. Save.
