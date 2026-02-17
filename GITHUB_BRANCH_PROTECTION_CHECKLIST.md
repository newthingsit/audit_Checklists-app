# GitHub Branch Protection Checklist

Use this checklist to enforce CI and release governance before merging to protected branches.

---

## Target Branches

Apply to at least:

- `master` (production)
- any long-lived release branch (if used)

---

## Required Status Checks

Mark these checks as **required**:

- `release-governance`
- `backend-tests`
- `web-tests`
- `mobile-tests`

These map to jobs in `.github/workflows/ci.yml`.

---

## Recommended Protection Rules

Enable:

- [x] Require a pull request before merging
- [x] Require approvals (minimum 1, recommended 2)
- [x] Dismiss stale approvals when new commits are pushed
- [x] Require status checks to pass before merging
- [x] Require branches to be up to date before merging
- [x] Restrict force pushes
- [x] Restrict branch deletions

Optional but recommended:

- [ ] Require conversation resolution before merging
- [ ] Require signed commits
- [ ] Require linear history

---

## Release Governance Expectations (PR)

For mobile-impact PRs (`mobile/**`, `app.json`, `mobile/app.json`, `eas.json`):

- PR must include: `Release-Type: APK` or `Release-Type: OTA`
- OTA is invalid if native/config files changed
- CI will suggest release type and fail invalid declarations

---

## Admin Setup Steps (GitHub UI)

1. Go to **Repository → Settings → Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `master`
4. Enable required settings above
5. In required checks, select:
   - `release-governance`
   - `backend-tests`
   - `web-tests`
   - `mobile-tests`
6. Save rule

Repeat for other protected branches if needed.

---

## Verification Steps

After enabling branch protection:

1. Open a test PR touching mobile files without release type
   - Expected: `release-governance` fails
2. Add `Release-Type: OTA` but touch `app.json`
   - Expected: `release-governance` fails with APK guidance
3. Set `Release-Type: APK`
   - Expected: governance passes (if all rules satisfied)
4. Verify merge button stays blocked until all required checks pass

---

## Fast Troubleshooting

### Required check missing in settings list

- Ensure workflow ran at least once on target branch.
- Re-run CI on a PR if needed.

### `mobile-tests` skipped unexpectedly

- For PRs, it is gated by `release-governance` by design.
- Fix governance failure first.

### Secret warnings in editor for E2E checks

- Static warnings may appear if secrets are not discoverable in local analysis.
- Runtime behavior depends on repository/org secret configuration.

---

## Ownership

Recommended owners:

- Engineering Lead (policy owner)
- QA Lead (quality gate owner)
- DevOps/Admin (GitHub settings owner)
