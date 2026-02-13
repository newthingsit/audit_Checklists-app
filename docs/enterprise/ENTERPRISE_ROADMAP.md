# Enterprise Roadmap

This document tracks the enterprise-hardening phases for the audit platform.

## Phase 0: Assessment
- Inventory runtime config, auth/RBAC, logging/tracing, health checks, and CI/CD.
- Baseline gaps and risks.

## Phase 1: Security Baseline (in progress)
- Enforce environment validation for production.
- Add request correlation id for auditing and support.
- Harden headers and default policies.
- Enforce validation dependencies in production.
- Align admin user management password policy with auth registration.
- Tighten upload image validation and size guards.
- Optional HTTPS enforcement via `FORCE_HTTPS=true`.

## Phase 2: Reliability Hardening
- Add readiness/liveness checks.
- Graceful shutdown hooks and startup health gates.
- Retry/backoff for external calls.
- Runtime safety handlers (unhandled rejection, uncaught exception).
- Server timeout configuration via env.

## Phase 3: Observability
- Standardize structured logging.
- Add metrics export and dashboards.
- Tighten tracing defaults.
- Add Prometheus metrics endpoint with token guard.
- Capture HTTP latency histogram.

## Phase 4: Performance
- Query/index review and caching strategy.
- Payload limits and response compression tuning.
- SQLite PRAGMA tuning (WAL, cache size, busy timeout).
- MSSQL pool sizing and timeout overrides via env.

## Phase 5: CI/CD + QA
- Environment promotion gates and approvals.
- Expanded automated test matrix.
- Add CodeQL + dependency review workflows.
- Add Dependabot for dependency updates.
- CI caching + npm ci for deterministic builds.

## Notes
- All phases support Azure, local dev, and on-prem deployments.
