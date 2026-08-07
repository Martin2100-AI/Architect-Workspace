# frontend

React + CRA + TypeScript frontend. See root [CLAUDE.md](../CLAUDE.md) — "Folder Responsibilities" and "UI/UX Design".

## Structure (created)

- `src/pages/` — top-level page components.
- `src/components/` — reusable UI.
- `src/routes/` — public/admin/portal route trees.
- `src/services/` — frontend API clients.

## Not yet created

`src/contexts/`, `src/styles/` — deferred until cross-cutting state/theming is actually needed (marked LATER in the approved architecture; see `docs/ARCHITECTURE.md`).

## Rules that apply here

- `tsc --noEmit` must pass before merge.
- No business logic or secrets in this tree — call backend services instead.
- No `dangerouslySetInnerHTML` without justification.
- The design system (palette, tokens, components, accessibility) lives in the design skills (`/baseline-ui`, `/frontend-design`, `/fixing-accessibility`, `/fixing-motion-performance`, `/ui-ux-design`), not this file — see root CLAUDE.md "UI/UX Design".
