# CI/CD + QA (Enterprise)

## CI Workflows
- `ci.yml`: backend + web + mobile test runs for pull requests.
- `codeql.yml`: weekly CodeQL analysis + PR/merge scanning.
- `dependency-review.yml`: dependency risk gate on PRs.
- `mobile-maestro.yml`: scheduled + manual mobile E2E coverage.

## Required Secrets
See [docs/CI_SECRETS.md](../CI_SECRETS.md).

## Release Expectations
- All CI checks green.
- Manual mobile QA recorded with [QA_REPORT_TEMPLATE.md](../../QA_REPORT_TEMPLATE.md).
- Staging validation before production promotion.

## Recommended Gates
- Block merges without CI success.
- Require CodeQL and dependency-review to pass.
- Require manual QA sign-off for mobile releases.
