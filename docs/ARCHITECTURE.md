# Architecture

**Status:** Foundation approved and scaffolded 2026-08-03 (Session `CC-20260803-k7q2`). This document is derived entirely from root [CLAUDE.md](../CLAUDE.md)'s own Folder Responsibilities and Architecture & System Layers sections — **not** from a product requirements doc, because none has been located in this repository yet. If/when a requirements doc, Project Builder output, or brief is added, this document should be revisited to confirm the structure still fits actual product needs.

## Folder tree (as of this scaffold)

```
Colaberry Project/
├── CLAUDE.md                  [EXISTING]
├── PROGRESS.md                [NOW — created this session]
├── .claude/                   [EXISTING]
├── backend/                   [CREATED]
│   ├── README.md
│   └── src/
│       ├── services/          [CREATED]
│       ├── routes/            [CREATED]
│       ├── models/            [CREATED]
│       ├── config/            [CREATED]
│       └── middleware/        [CREATED]
├── frontend/                  [CREATED]
│   ├── README.md
│   └── src/
│       ├── pages/              [CREATED]
│       ├── components/        [CREATED]
│       ├── routes/             [CREATED]
│       └── services/           [CREATED]
├── directives/                 [CREATED — empty, awaiting first SOP]
│   └── README.md
├── tests/
│   ├── README.md
│   └── systemV2/                [CREATED — empty, awaiting first Playwright spec]
├── docs/                       [CREATED]
│   ├── README.md
│   └── ARCHITECTURE.md         (this file)
│
│   -- Deferred (not created this session) --
├── backend/src/services/agents/   [LATER — create only if agent orchestration is confirmed in scope]
├── backend/src/intelligence/      [LATER — create only if a planning/decision-engine layer is confirmed in scope]
├── backend/src/scripts/           [LATER — create at the first one-off operational script]
├── backend/src/seeds/             [LATER — create at the first migration/seed]
├── frontend/src/contexts/         [LATER — create when cross-cutting state is needed]
├── frontend/src/styles/           [LATER — create when a styling layer beyond the design skills is needed]
├── scripts/ (repo root)           [LATER — create at the first repo-root operational script]
├── nginx/                         [LATER — create only at first production deploy]
├── tmp/                           [GENERATED — created on demand by scripts (e.g. `/tmp/escalation.json`), gitignored, never pre-created]
├── execution/                     [CONDITIONAL / LEGACY / DO-NOT-TOUCH — only applies if a pre-Node Python system actually exists; unconfirmed, not created]
├── intelligence/ (repo root)      [CONDITIONAL — overlaps with backend/src/intelligence/; needs an explicit scope decision before creation]
├── system/                        [GENERATED / DO-NOT-TOUCH — owned by an external "portal" system via the Telemetry Synchronization Contract; Claude must never create or edit this]
└── preview-db-init/               [LATER — create only if a preview-stack Docker setup is introduced]
```

## Traceability

| Path | CLAUDE.md section | Status this session |
|---|---|---|
| `backend/src/{services,routes,models,config,middleware}/` | Architecture & System Layers; Folder Responsibilities | Created |
| `frontend/src/{pages,components,routes,services}/` | Architecture & System Layers; Folder Responsibilities | Created |
| `directives/` | Folder Responsibilities; Directive validation | Created, empty |
| `tests/systemV2/` | Folder Responsibilities; Testing & Validation Rules | Created, empty |
| `docs/` | Folder Responsibilities; Screenshot Capture + Review HTML | Created |
| `PROGRESS.md` | Logging, Reporting & Progress Tracking | Created |
| `backend/src/{services/agents,intelligence,scripts,seeds}/` | Folder Responsibilities | Deferred (LATER) |
| `frontend/src/{contexts,styles}/` | Folder Responsibilities | Deferred (LATER) |
| `scripts/`, `nginx/`, `preview-db-init/` | Folder Responsibilities | Deferred (LATER) |
| `tmp/` | Folder Responsibilities; Escalation Protocol; Per-change autonomy log | Deferred (GENERATED on demand) |
| `execution/` | Folder Responsibilities | Deferred (LEGACY / DO-NOT-TOUCH / unconfirmed) |
| `intelligence/` (root) | Folder Responsibilities | Deferred (CONDITIONAL / unconfirmed) |
| `system/` | Folder Responsibilities; Telemetry Synchronization Contract | Not created — DO-NOT-TOUCH, portal-owned |

## Assumptions logged this session

1. No project requirements doc, README, Project Builder output, or brief exists anywhere in this repository — confirmed by direct inspection. This scaffold reflects CLAUDE.md's governance structure only, not confirmed product requirements.
2. `frontend/` was scaffolded alongside `backend/` even though the prior proposal marked it NOW/LATER (ambiguous). Resolved per CLAUDE.md's Default Resolution Strategy — simplest, deterministic, reversible, local blast radius — since CLAUDE.md's Architecture & System Layers table lists both trees symmetrically as "the actual stack."
3. `execution/` and root-level `intelligence/` were **not** created: CLAUDE.md describes them as pre-existing conventions (a legacy pre-Node system, and a reserved subsystem), but neither is confirmed to actually exist or be in scope for this project. Creating them speculatively would risk inventing structure the product doesn't need — flagged here rather than assumed.
4. No `package.json`, dependency manifest, or `node_modules` was created — out of scope per explicit instruction ("do not install any dependencies") and not needed for folder scaffolding.

## Open item

The recommended home for the user's "Week 3 component" is still blocked on knowing what that component is (UI page, backend service, script, directive, etc. — see placement table in the approved proposal). Nothing was assumed here.
