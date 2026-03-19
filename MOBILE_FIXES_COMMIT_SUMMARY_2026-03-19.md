# Mobile Fixes Commit Summary

Date: 2026-03-19
Scope: mobile audit fixes, test stabilization, Android artifact validation

## Recommended Commit Title

feat: harden mobile audit flows and stabilize Expo 54 test baseline

## PR Release Type

Required PR metadata for this change set:

- `Release-Type: APK`

Why:

- The repo CI policy treats changes to `mobile/package.json` as native/config-impacting mobile changes.
- `OTA` is not valid for this diff under the current PR enforcement workflow.

## Summary

This change set finishes the permanent mobile-side repair work for the audit flow issues and clears the broader mobile Jest baseline.

Primary outcomes:

- Audit completion state is normalized from actual progress, not stale raw status values.
- Photo uploads now use the shared authenticated API client instead of a separate fetch path.
- Notification settings error handling is resilient to async failures.
- Expo 54 mobile Jest setup is aligned and the stale screen and integration suites are updated to current contracts.
- Full mobile Jest baseline is green.

## Functional Fixes

Backend and mobile audit status handling:

- Auto-heal stale completed audits in backend audit list/detail routes.
- Derive effective mobile audit status from completed item counts.
- Prevent completed audits from still rendering as `in_progress` in history and detail flows.

Photo upload path:

- Replace ad hoc upload fetch logic with the shared authenticated API client.
- Preserve retry behavior for timeout, rate-limit, and transient network failures.
- Remove split auth handling that could drift from the main API stack.

Notification settings:

- Add explicit async failure handling for reminder-time changes.
- Add explicit async failure handling for clear-all notifications.

## Test and Harness Fixes

Jest and Expo alignment:

- Move mobile Jest to the Expo-compatible configuration used by the current SDK.
- Pin Jest and `jest-expo` to Expo 54 compatible versions.
- Add the missing empty module mock used by Expo test resolution.

Screen suites updated:

- Audit detail, audit history, audit form, dashboard, checklists, category selection, notification settings, and tasks suites were aligned to the current screen behavior and context contracts.

Integration harness fixes:

- `mockApiEndpoint` now composes multiple handlers for the same HTTP verb instead of replacing the previous handler.
- Shared fixtures return plain objects instead of already-settled promises.
- Location integration mocks include `checkPermission`.
- Removed nondeterministic test behavior caused by `Math.random()`.

## Validation Completed

Mobile test baseline:

- Command: `npm --prefix mobile test -- --runInBand --watchAll=false`
- Result: `38` suites passed, `1270` tests passed, `0` failures.

Expo config validation:

- Command: `Push-Location mobile; npm exec -- expo config --json; Pop-Location`
- Result: Expo config resolved successfully for app version `2.1.5`, Android package `com.kapilchauhan.auditpro`, Expo SDK `54.0.0`.

Android local build feasibility:

- Command: `Push-Location mobile; npm exec -- eas build --platform android --profile preview --non-interactive --local; Pop-Location`
- Result: blocked as expected on Windows because EAS local Android builds require macOS or Linux.

## Current Artifact Status

What is validated locally:

- Mobile source changes compile well enough to satisfy the full Jest baseline.
- Expo manifest/config resolves correctly from the mobile workspace.
- EAS CLI is installed and available locally.

What is not producible directly from this Windows shell:

- A local Android APK via `eas build --local`.

Supported next artifact paths for this repo:

- Manual/cloud EAS build from the mobile workspace.
- WSL2/macOS/Linux local build path.
- A future GitHub Actions APK workflow if you decide to enable build steps in CI.

Current GitHub workflow reality:

- `.github/workflows/mobile-ci.yml` runs tests and quality gates.
- The same workflow explicitly skips preview and production EAS builds in CI.
- `.github/workflows/mobile-maestro.yml` is an Android smoke-test workflow, not an APK packaging workflow.
- `.github/workflows/mobile-apk-build.yml` now provides a manual Android EAS build path through GitHub Actions.

## Suggested Follow-up Commands

Cloud or CI artifact path:

- `Push-Location mobile; npm exec -- eas build --platform android --profile preview; Pop-Location`

WSL/Linux local artifact path:

- `cd /mnt/d/audit_Checklists-app/mobile && npx eas build --platform android --profile preview --local --output app-preview.apk`

## Risk Notes

- The mobile suite is now green, but production APK generation still depends on a supported build host.
- The repo contains unrelated pre-existing changes outside this summary; they were not reverted.
