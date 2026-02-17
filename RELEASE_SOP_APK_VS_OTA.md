# Release SOP: APK Build vs OTA Update

This SOP defines **when to ship a new APK** vs **when to ship an OTA update** for this project.

---

## 1) Decision Matrix

### Build a new APK (required)

Use APK build when **any** of these change:

- `app.json` or `mobile/app.json` app config (permissions, splash/icon, package, runtime, updates)
- `android.versionCode` or native identity/package values
- Expo SDK / React Native / native module versions (`expo-*`, `react-native-*`)
- Anything that touches native binaries or platform permissions

### OTA update (allowed)

Use OTA only when changes are **JS/TS-only**, such as:

- UI/UX logic
- form validation/business rules
- API calling logic (without native dependency changes)
- bug fixes inside `mobile/src/**` that do not require native rebuild

---

## 2) Current Project Standards (must follow)

- Keep these files aligned before release:
  - `app.json`
  - `mobile/app.json`
- Current baseline (as of 2026-02-16):
  - `expo.version`: `2.1.4`
  - `android.versionCode`: `7`
  - `runtimeVersion.policy`: `appVersion`
- EAS channels in use (`eas.json`):
  - `preview`
  - `production`

---

## 3) Standard Release Flow

### A) Baseline / Native-impact release (APK)

1. Verify config parity (`app.json` and `mobile/app.json`).
2. Build APK:
   - `npx eas-cli build --platform android --profile preview`
3. Install/test on device (smoke tests):

   - Login
   - Continue Audit flow
   - Photo upload
   - Dashboard/Report load

4. Promote to production build path after QA sign-off.

### B) Fast JS hotfix release (OTA)

1. Confirm no native/config changes.
2. Publish OTA to target channel:

   - Preview: `npx eas-cli update --channel preview --message "hotfix: <short summary>"`
   - Production: `npx eas-cli update --channel production --message "hotfix: <short summary>"`

3. Validate update pickup on devices.

---

## 4) Guardrails (QA + Release)

Before **every** release:

- [ ] Run preflight parity check: `npm run release:preflight`
- [ ] No config drift between `app.json` and `mobile/app.json`
- [ ] PR includes `Release-Type: APK` or `Release-Type: OTA`
- [ ] Backend API health endpoint is green
- [ ] Critical mobile flow test passed (Login + Continue Audit + Submit)
- [ ] Release note includes: change type = `APK` or `OTA`

If any uncertainty exists, choose **APK build** (safer).

---

## 5) Rollback Strategy

### OTA rollback

- Re-publish previous known-good OTA to same channel.

### APK rollback

- Re-distribute previous signed APK artifact.

---

## 6) Practical Rule for This Repo

Given historical recurring failures (blank screen/config drift, deployment mismatches), default policy is:

- **APK for baseline/stability releases**
- **OTA only for small JS-only hotfixes after baseline is stable**

---

## 7) Repository Enforcement

To enforce this SOP in GitHub branch settings, follow:

- `GITHUB_BRANCH_PROTECTION_CHECKLIST.md`

For local developer validation before opening PRs:

- `npm run check:release-type -- --type=APK`
- `npm run check:release-type -- --type=OTA`
- Combined local gate: `npm run release:local-guard -- --type=APK`
- Optional automatic pre-push enforcement: `LOCAL_GIT_HOOKS_SETUP.md`
- Local hooks diagnostics: `npm run hooks:doctor`

Current baseline APK QA runbook:

- `POST_BUILD_QA_SCRIPT_APK_16787afa.md`
