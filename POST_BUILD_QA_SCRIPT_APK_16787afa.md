# Post-Build QA Execution Script (APK)

## Build Under Test

- Build ID: `16787afa-b5da-4f70-b10f-f507628cbc41`
- Release Type: `APK`
- Build Profile: `preview`
- Install Link: [Expo Build](https://expo.dev/accounts/kapilchauhan/projects/audit-pro/builds/16787afa-b5da-4f70-b10f-f507628cbc41)
- Date: 2026-02-16

---

## Scope

Validate baseline stability for mobile release readiness:

- Authentication
- Continue Audit flow
- Category progression
- Photo upload and persistence
- Save/resume behavior
- Submission + history visibility

---

## Test Environment Matrix

Fill this before execution:

- Tester Name: ____________________
- Device Model: ____________________
- Android Version: ____________________
- Network: Wi-Fi / 4G / 5G
- Backend URL in app: Production
- Test User: ____________________
- Start Time: ____________________
- End Time: ____________________

---

## Pre-Checks (Must Pass)

- [ ] APK installed successfully from build link
- [ ] App opens without blank screen
- [ ] Login screen renders within 5 seconds
- [ ] No critical startup crash
- [ ] API health reachable from app flows

If any pre-check fails, stop and log blocker.

---

## Step-by-Step QA Script

### 1) Login & Session

1. Open app.
2. Login with valid QA account.
3. Logout and login again.

Expected:

- [ ] Login succeeds without CORS/network error UI
- [ ] Session persists while app is foregrounded
- [ ] No crash or freeze

### 2) New Audit Start

1. Navigate to Checklists.
2. Open one QA checklist and one CVR checklist (separate runs).
3. Select outlet/store.
4. Enter audit form.

Expected:

- [ ] Checklist opens correctly
- [ ] Items and categories render
- [ ] No missing template/config error

### 3) Continue Audit / Category Progression (Critical)

1. Start multi-category audit.
2. Complete category 1 and submit progress.
3. Exit audit and use Continue Audit.
4. Repeat to category 2 and continue again.

Expected:

- [ ] App auto-selects first incomplete category
- [ ] Completed categories are not repeated
- [ ] Progression order is correct
- [ ] No data reset between resumes

### 4) Photo Upload + Persistence (Critical)

1. For option item with photo support, add photo from camera or gallery.
2. Save progress.
3. Kill app.
4. Reopen and continue same audit.

Expected:

- [ ] Photo upload succeeds
- [ ] Thumbnail/preview appears
- [ ] Photo remains after reopen/resume
- [ ] Submission with photo succeeds

### 5) Save/Resume Integrity

1. Fill partial audit (mix of Yes/No/NA + comments).
2. Save draft/in-progress.
3. Force close app.
4. Reopen and continue.

Expected:

- [ ] All marks persist
- [ ] Comments persist
- [ ] Category state persists
- [ ] No duplicate/ghost records

### 6) Final Submit + History Verification

1. Complete remaining items.
2. Submit audit.
3. Open Audit History.
4. Open completed record.

Expected:

- [ ] Status = Completed
- [ ] Score shown
- [ ] Photos visible in record/report surfaces (if enabled)
- [ ] No 500-style user-facing error

---

## Negative/Resilience Checks

- [ ] Toggle network off during save; app handles gracefully
- [ ] Retry after network restored works
- [ ] Invalid login shows user-friendly error
- [ ] No unhandled red-screen/crash in core flows

---

## Evidence to Capture

Attach these artifacts:

- [ ] Screenshot: login success
- [ ] Screenshot: continue audit category auto-selection
- [ ] Screenshot: photo attached in item
- [ ] Screenshot: resumed audit with same photo/data
- [ ] Screenshot: completed audit in history
- [ ] Short screen recording for one full critical flow (optional but recommended)

---

## Defect Logging Template

For each issue:

- Severity: Blocker / Critical / Major / Minor
- Area: Login / Continue Audit / Photo / Save-Resume / Submit / History
- Repro Steps:
- Expected:
- Actual:
- Device + OS:
- Screenshot/Video Link:

---

## Exit Criteria

Release recommendation = **GO** only if:

- [ ] All critical sections (3, 4, 5, 6) pass
- [ ] No blocker/critical defects open
- [ ] At most minor cosmetic defects remain
- [ ] Evidence pack completed

If any blocker/critical issue exists, mark **NO-GO**.

---

## Final Sign-Off

- QA Result: GO / NO-GO
- QA Lead: ____________________
- Date: ____________________
- Notes: ____________________
