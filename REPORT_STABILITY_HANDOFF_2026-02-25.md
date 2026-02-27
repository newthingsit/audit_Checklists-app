# Report & PDF Stability Handoff (2026-02-25)

## Scope Completed

This handoff covers production hardening for audit report generation and PDF download reliability.

### Goals addressed

- Prevent long-hanging report/PDF requests.
- Keep UI functional when enhanced PDF fails.
- Validate score/deviation report consistency end-to-end.
- Document operational configuration for deployment.

---

## Backend Changes

### 1) Timeout + validation guards in report routes

**File:** `backend/routes/reports.js`

Implemented:

- `parsePositiveInteger()` for strict audit ID validation.
- `withTimeout()` helper for bounded async route execution.
- `getEnhancedPdfTimeoutMs()` (default `15000`).
- `getReportDataTimeoutMs()` (default `10000`).

Applied to:

- `GET /api/reports/audit/:id/enhanced-pdf`
  - Returns `400` for invalid ID.
  - Returns `404` for inaccessible audit.
  - Returns `504` on timeout.
  - Verifies generated buffer is non-empty before sending.
  - Attempts action-plan readiness before generation (best effort).
- `GET /api/reports/audit/:id/report`
  - Returns `400` for invalid ID.
  - Uses timeout guard and returns `504` when exceeded.

---

## Frontend Changes

### 2) Enhanced PDF fallback consistency

Enhanced-first + legacy fallback implemented across key web flows:

- `web/src/pages/AuditHistory.js`
  - Download PDF: `enhanced-pdf` -> fallback `/pdf`
  - Preview PDF: `enhanced-pdf` -> fallback `/pdf`
- `web/src/components/ExportMenu.js`
  - Single-audit PDF export: `enhanced-pdf` -> fallback `/pdf`
- `web/src/pages/AuditDetail.js`
  - Enhanced report download: `enhanced-pdf` -> fallback `/pdf`
- `web/src/pages/AuditReport.js`
  - Server PDF export: `enhanced-pdf` -> fallback `/pdf`
- `web/src/pages/AuditForm.js`
  - Completion PDF default URL now prefers `enhanced-pdf`

### 3) Scheduled audit reschedule UX alignment

**File:** `web/src/pages/ScheduledAudits.js`

Implemented:

- Reschedule count fetch scoped by `scheduled_audit_id`.
- Reschedule messaging aligned with per-checklist semantics.
- Safer date value normalization helper for dialog input.
- Removed stale global count refresh behavior.

---

## Documentation Updates

- `backend/README.md`
  - Added report endpoint behavior and timeout env vars.
- `DEPLOYMENT_CHECKLIST.md`
  - Added backend deployment checklist items:
    - `ENHANCED_PDF_TIMEOUT_MS`
    - `REPORT_DATA_TIMEOUT_MS`
- `README.md`
  - Added `Report Stability Smoke Check` section with root-level command examples.

---

## Runtime Configuration

Set in production environment:

```env
ENHANCED_PDF_TIMEOUT_MS=15000
REPORT_DATA_TIMEOUT_MS=10000
```

Baseline source of truth:

- `backend/.env.production.example`
- `PRODUCTION_APP_SETTINGS_TEMPLATE.md`

Pre-deploy validation command:

```bash
npm run env:check:prod
```

One-command preflight (root):

```bash
npm run preflight:prod
```

Alternative (backend folder):

```bash
cd backend
npm run env:check:prod
```

Tuning guidance:

- Increase values if PDF generation frequently times out with very large reports.
- Keep values bounded to avoid user-facing hangs and thread exhaustion.

---

## Validation Executed

### Build & diagnostics

- `npm --prefix web run build` -> success (warnings only, no blocking errors).
- Diagnostics for touched web/backend files -> no new compile issues.

### Backend runtime sanity

- `node -e "require('./backend/routes/reports'); console.log('reports route load OK')"` -> success.

### Report/scoring integration

- `node backend/tests/test-report-generation.js` -> passed:
  - report summary present
  - `scoreByCategory` present
  - non-scored items excluded from totals
  - action-plan parity validated

### Deviations endpoint contract

- Live API probe passed for:
  - `GET /api/reports/audit/:id/deviations`
  - valid `top_3_deviations` array and counts

---

## Operational Smoke Test (Post-Deploy)

1. Open one completed audit in web history.
2. Trigger PDF download from:
   - Audit History
   - Audit Detail
   - Audit Report (Server PDF)
3. Confirm behavior:
   - Enhanced PDF downloads when healthy.
   - Fallback PDF still downloads if enhanced route times out/fails.
4. Call API directly for one completed audit ID:
   - `GET /api/reports/audit/{id}/report`
   - `GET /api/reports/audit/{id}/deviations`
5. Verify status-code behavior with invalid/non-completed IDs (`400`, `404`, `409` as applicable).

---

## Rollback Plan (Low Risk)

If needed:

1. Revert frontend callsite fallback changes in affected web pages.
2. Revert timeout wrapper changes in `backend/routes/reports.js`.
3. Keep docs/env entries; they are non-breaking.

Rollback impact:

- You may reintroduce hanging PDF/report requests and reduced resiliency.

---

## Known Non-Blocking Notes

- Repository has many unrelated pre-existing changes (including mobile coverage artifacts).
- Markdown lint warnings remain in legacy docs style; no functional impact.
- Production env validation is now available via `cd backend && npm run env:check:prod` before deploy.

---

## PR Draft (Copy/Paste)

### Suggested Title

`fix(reports): harden enhanced PDF/report routes with timeouts and add client fallback`

### Summary

- Adds timeout-bounded execution and audit-id validation for report endpoints.
- Returns clear status codes (`400/404/409/504`) for report/PDF failure modes.
- Makes web PDF downloads resilient by using enhanced-PDF first with legacy-PDF fallback.
- Aligns scheduled-audit reschedule UX with checklist-scoped backend rules.
- Documents required runtime env vars and deployment checklist updates.

### Files changed (functional)

- `backend/routes/reports.js`
- `web/src/pages/AuditHistory.js`
- `web/src/components/ExportMenu.js`
- `web/src/pages/AuditDetail.js`
- `web/src/pages/AuditReport.js`
- `web/src/pages/AuditForm.js`
- `web/src/pages/ScheduledAudits.js`

### Files changed (documentation)

- `backend/README.md`
- `DEPLOYMENT_CHECKLIST.md`
- `REPORT_STABILITY_HANDOFF_2026-02-25.md`

### Validation evidence

- `npm --prefix web run build` (success; warnings only)
- `node -e "require('./backend/routes/reports'); console.log('reports route load OK')"` (success)
- `node backend/tests/test-report-generation.js` (passed)
- Live API check: `/api/reports/audit/:id/deviations` returned 200 with valid payload shape
- `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-report-stability.ps1 -BaseUrl "http://localhost:5000" -Email "testadmin@test.com" -Password "Test123!"` (passed)
- `npm run smoke:report-stability -- -BaseUrl "http://localhost:5000" -Email "testadmin@test.com" -Password "Test123!"` (passed)

### Automation note

- `scripts/smoke-report-stability.ps1` uses `Invoke-WebRequest -UseBasicParsing` for PDF checks to keep execution non-interactive on Windows PowerShell.

### Risk assessment

- **Risk level:** Low to medium
- **Why:** Endpoint behavior is hardened but not redesigned; frontend fallback is backward-compatible.
- **Primary risk:** More `504` responses under heavy load if timeouts are too aggressive.

### Rollback

1. Revert `backend/routes/reports.js` timeout/validation wrapper changes.
2. Revert web fallback callsite changes to prior single-route behavior.
3. Keep docs/env entries (non-breaking).

### Post-deploy checks

- Verify `ENHANCED_PDF_TIMEOUT_MS` and `REPORT_DATA_TIMEOUT_MS` are set.
- Download PDF from Audit History, Audit Detail, and Audit Report pages.
- Confirm report JSON and deviations endpoints return expected data for completed audits.

### One-command smoke script

- Script: `scripts/smoke-report-stability.ps1`
- NPM shortcut: `npm run smoke:report-stability -- -BaseUrl "https://<your-api-host>" -Email "<email>" -Password "<password>"`
- VS Code Tasks:
  - `Backend: Start API` (starts local backend in background)
  - `Backend: Stop API (Node on 5000)` (stops local backend listener on port `5000`)
  - `Smoke: Report Stability (Local)` (uses `http://localhost:5000` and prompts for credentials)
  - `Smoke: Report Stability` (prompts for base URL and credentials)
  - `Smoke: Full Local Flow` (runs backend start + local smoke in sequence)
- With env vars:
  - `$env:REPORT_SMOKE_EMAIL='testadmin@test.com'`
  - `$env:REPORT_SMOKE_PASSWORD='Test123!'`
  - `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-report-stability.ps1 -BaseUrl "https://<your-api-host>"`
- Or pass credentials directly:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-report-stability.ps1 -BaseUrl "https://<your-api-host>" -Email "<email>" -Password "<password>"`
