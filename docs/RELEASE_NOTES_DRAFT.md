# Release Notes Draft

## GitHub Release Notes

### Title
Audit UX Enhancements: Recurring Failures, Progress CTAs, and Navigation

### Summary
- Recurring failures are non-blocking and actionable with banner controls and a persistent header shortcut.
- Audit flow CTAs are clearer and consistent across CVR and standard themes.
- Recurring items show resolution status and allow quick access to prior comments.

### Mobile Changes
- Added recurring failures banner with View/Next navigation and a resolved counter.
- Added persistent "Next recurring" control in the sticky header.
- Added precise jump-to-recurring behavior for faster triage.
- Added Recurring and Resolved badges on items, with a toggle to reveal prior comments.
- Updated audit flow labels: "Continue to Checklist" and dynamic "Save Progress" / "Submit Audit".
- Added helper microcopy for location verification and progress saving.

### QA Summary
- Automated tests: PASS (see docs/RELEASE_TEST_SUMMARY.md)
- Expo Go Metro smoke start: PASS

### Notes
- Two full-checklist tests were skipped due to missing templates in the test environment.

## Expo Release Notes

### Title
Audit Flow and Recurring Issues Improvements

### What changed
- Clearer audit buttons and helper text to guide the audit flow.
- Recurring issues are highlighted with quick navigation.
- Resolved recurring items are now visible in the checklist.

### QA
- Automated tests: PASS (see docs/RELEASE_TEST_SUMMARY.md)
- Metro bundler startup: PASS

### Known limitations
- Two full-checklist tests were skipped because required templates are not present in the test environment.
