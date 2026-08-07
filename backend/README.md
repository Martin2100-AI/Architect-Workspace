# backend

Node.js + Express + TypeScript backend. See root [CLAUDE.md](../CLAUDE.md) — "Folder Responsibilities" and "Architecture & System Layers".

## Structure (created)

- `src/services/` — business logic services. One responsibility per file (Modular Composition Rule).
- `src/routes/` — Express route definitions (admin, portal, public).
- `src/models/` — Sequelize models. These are the database contract.
- `src/config/`, `src/middleware/` — infra wiring (env config, auth/session middleware).

## Not yet created

`src/services/agents/`, `src/intelligence/`, `src/scripts/`, `src/seeds/` — deferred until a specific need is confirmed (marked LATER in the approved architecture; see `docs/ARCHITECTURE.md`).

## Rules that apply here

- `tsc --noEmit` must pass before merge.
- No `any` without a written justification comment.
- Every route validates inbound request/query/route params (Zod or equivalent) and rejects malformed input with 400 before it reaches business logic.
- No secrets, hostnames, or environment-specific values hardcoded in source — env vars only.
- New business logic ships with at least one unit test covering the happy path.
