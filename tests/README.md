# tests

Automated verification layer. See root [CLAUDE.md](../CLAUDE.md) — "Testing & Validation Rules" and "Test Strategy Framework".

## Structure (created)

- `systemV2/` — Playwright / browser end-to-end flows.

## Rules

- Test pyramid target: ~70% unit (lives alongside source in `backend/src/**/*.test.ts` etc., not in this folder), ~20% integration, ~10% E2E.
- Integration and E2E tests must never touch production.
- Every shipped feature needs: happy path, failure path, boundary cases, idempotency validation.
