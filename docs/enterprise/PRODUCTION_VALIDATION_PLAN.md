# Production Validation Plan

Use this plan after production deployment to verify system integrity and rollback readiness.

## A) Pre-Deployment Gates
- [ ] CI workflows green (backend, web, mobile tests).
- [ ] CodeQL and dependency review checks green.
- [ ] Staging verification checklist completed.
- [ ] Rollback plan confirmed (previous build available).

## B) Deployment Validation (Immediate)
- [ ] Backend health endpoints OK: /api/health, /api/healthz, /api/readyz.
- [ ] Web app loads and authenticates.
- [ ] API requests return expected CORS headers.
- [ ] Key logs show no spike in errors.

## C) Functional Smoke Tests
- [ ] Admin login successful.
- [ ] Start audit, save draft, resume.
- [ ] Upload photo and confirm preview.
- [ ] Complete audit and verify report.
- [ ] History displays completed audit.

## D) Observability Checks
- [ ] Metrics endpoint reachable (if enabled).
- [ ] Tracing shows requests (if configured).
- [ ] Error logs include request ids.

## E) Performance Checks
- [ ] Health endpoints < 200 ms after warmup.
- [ ] Key flows respond under acceptable latency.

## F) Post-Deployment Monitoring (24h)
- [ ] Watch error rate and authentication failures.
- [ ] Monitor database connection pool stability.
- [ ] Track photo upload latency and failures.

## G) Rollback Criteria
- [ ] Sustained error rate above threshold.
- [ ] Critical flow regressions (login, audit submit).
- [ ] Data corruption or missing audit data.

## H) Rollback Steps
- [ ] Redeploy previous successful build.
- [ ] Confirm backend health endpoints and key flows.
- [ ] Notify stakeholders with incident summary.

---

## Execution Results (2026-02-13)

**Environment used:** staging URLs (per approval)
- Web: https://app.litebitefoods.com
- API: https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net

**Checklist used:** NEW CVR - CDR Checklist

### B) Deployment Validation (Immediate)
- [x] Backend health endpoints OK: /api/health, /api/healthz, /api/readyz.
- [ ] Web app loads and authenticates.
- [ ] API requests return expected CORS headers.
- [ ] Key logs show no spike in errors.

### C) Functional Smoke Tests (API)
- [x] Admin login successful.
- [ ] Start audit, save draft, resume.
- [x] Upload photo and confirm preview.
- [x] Complete audit and verify report.
- [ ] History displays completed audit.

**Notes:**
- Audit created and completed via API; PDF endpoint returned HTTP 200.
- Audit completion score returned 0; confirm if expected for this checklist.

### D) Observability Checks
- [ ] Metrics endpoint reachable (if enabled).
- [ ] Tracing shows requests (if configured).
- [ ] Error logs include request ids.

### E) Performance Checks
- [ ] Health endpoints < 200 ms after warmup.
- [ ] Key flows respond under acceptable latency.

### F) Post-Deployment Monitoring (24h)
- [ ] Watch error rate and authentication failures.
- [ ] Monitor database connection pool stability.
- [ ] Track photo upload latency and failures.
