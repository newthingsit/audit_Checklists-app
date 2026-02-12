# Mobile QA Guide (Manual SOP)

## Pre-Reqs
- App running in Expo Go (dev) or installed standalone build.
- Valid test user credentials with audit permissions.
- Backend API reachable.

## CI Run Modes (Summary)
- Nightly: QA smoke only (New QA – CDR) on Android.
- Manual: CVR smoke (NEW CVR – CDR Checklist).
- Full: CVR 100% completion via API tests + UI verification in Maestro.

## A) Login
1. Launch the app.
2. Enter email and password.
3. Tap Sign In.

## B) Start Audit (CVR and QA)
1. Tap Checklists.
2. Search and select the checklist by name:
   - NEW CVR – CDR Checklist
   - New QA – CDR
3. Select an Outlet/Store.
4. Capture location if prompted.
5. Tap Next to enter the checklist.

## C) Complete All Points (100%)
Follow deterministic rules for every question:
- option_select:
  - Every 10th question: No
  - Otherwise: Yes
  - Every 25th question: NA (if available)
  - Add comment every 7th question: "Completed in automated test"
  - Upload photo on the first 3 questions that show a photo control
- number:
  - Enter values in sequence: 12, 15, 18, 20, 22 (repeat)
- short_answer:
  - Use "T12" or "Test Dish" or "Test Manager" based on label
- long_answer:
  - "All points completed for full checklist testing."
- image_upload:
  - Upload a photo from camera and from gallery (one each across the run)
- signature:
  - Draw a simple signature and save

Success condition: Required remaining count reaches 0 for all categories.

## D) Save / Resume
1. Tap Save Audit.
2. Force close the app.
3. Reopen and log in.
4. Go to History, open the in-progress audit, tap Continue Audit.
5. Verify all prior answers, photos, and signature persisted.

## E) Submit and Verify
1. Tap Save/Submit to complete the audit.
2. Navigate to History.
3. Open the completed audit.
4. Verify:
   - Status shows Completed
   - Score is present
   - Photos render in report view
   - Signature renders in report view
   - Action plan appears for No answers (if feature enabled)

## F) Repeat for Other Platforms
- Android standalone build:
  - Install APK/AAB
  - Repeat sections A–E for New QA – CDR
- iOS standalone build:
  - Simulator build and TestFlight build
  - Repeat sections A–E for New QA – CDR

## CVR Specific Guidance
- Smoke: Use Maestro smoke flow (10 questions + photo + signature + save/resume + history).
- Full: Run API-based 100% completion, then verify in UI that audit is completed and visible in history.

## Evidence Collection
- Capture screenshots for any failures.
- Record logs if upload, save, or submit fails.
- Include steps and device info in QA report.
