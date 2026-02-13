# Staging Verification Checklist

Use this checklist after every enterprise hardening release before production promotion.

## 1) Environment Readiness
- [ ] Backend deployed to staging and healthy.
- [ ] Web app deployed to staging and reachable.
- [ ] Mobile build uses staging API URL.
- [ ] Required secrets are set (see docs/CI_SECRETS.md).
- [ ] Database migration status verified (no pending schema issues).

## 2) Backend Health
- [ ] GET /api/health returns OK.
- [ ] GET /api/healthz returns OK.
- [ ] GET /api/readyz returns OK.
- [ ] Logs show no startup errors or repeated retries.

## 3) Authentication & Security
- [ ] Admin login succeeds.
- [ ] Refresh token rotation works.
- [ ] Unauthorized access returns 401/403.
- [ ] CORS headers present for allowed origins.
- [ ] Rate limiting works (login and general API).

## 4) Core Flows (Web)
- [ ] Create audit from template.
- [ ] Photo upload works on option items and image upload items.
- [ ] Save draft and resume works.
- [ ] Complete audit and verify report.

## 5) Core Flows (Mobile)
- [ ] Login works (Expo Go or staging build).
- [ ] Select checklist and outlet.
- [ ] Capture photo (camera) and pick from gallery.
- [ ] Save and resume from history.
- [ ] Complete audit and verify report view.

## 6) Analytics & Reports
- [ ] Dashboard loads without errors.
- [ ] Reports generate without server errors.
- [ ] Audit history and details load.

## 7) Observability
- [ ] Metrics endpoint reachable (if enabled).
- [ ] Tracing pipeline receives spans (if configured).
- [ ] Error logs include request ids.

## 8) Performance Sanity
- [ ] Health endpoints respond under 200 ms after warmup.
- [ ] Key pages load under acceptable latency.

## 9) Exit Criteria
- [ ] All critical items above pass.
- [ ] QA report completed and attached.
