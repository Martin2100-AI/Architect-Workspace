---
name: executive-dashboard-brief
description: Use when the user asks to turn a data-quality result, failed refresh, pipeline incident, KPI variance, or technical investigation into an executive dashboard update. Produces a concise leadership brief containing status, business impact, verified evidence, decision needed, owner, and next update time.
---

# Executive Dashboard Brief

## When this applies

Invoke this skill when the user wants a technical result (data-quality report, ETL triage report, failed refresh, pipeline incident, KPI variance) translated into a leadership-facing status update. Do NOT invoke it to produce the underlying technical analysis itself — use `data-quality-gate` or `etl-failure-triage` (or the user's own investigation) for that first. This skill only reformats an already-completed, evidence-backed result for an executive audience; it does not run new checks or diagnose new failures.

## Step 1 — Require a supplied quality or triage report

Ask for (or use, if already given) the underlying report(s) this brief is based on — e.g. a `data-quality-gate` report, an `etl-failure-triage` report, or another investigation the user supplies. Do not invent a technical result to summarize. If nothing is supplied, stop and request it.

## Step 2 — Separate verified facts from unresolved questions

Every statement in the brief must trace back to something the supplied report(s) actually state. A **verified fact** is a status, count, cause, or action directly present in the source report. An **unresolved question** is anything the source report does not state (e.g. dollar impact, root cause not yet confirmed, owner not yet assigned). Sort every claim into one of these two buckets before drafting — never blend them.

## Step 3 — Never invent financial impact, cause, owner, or timing

If the source report(s) do not state a dollar figure, a confirmed cause, a named owner, or a concrete next-update time, do not supply one. Write "Not yet quantified," "Unknown — pending investigation," "Unassigned," or an equivalent explicit placeholder instead. Fabricating any of these four fields is a hard failure of this skill, even if a plausible-sounding value would make the brief read better.

## Step 4 — Strip raw technical detail

Leave out log lines, stack traces, SQL, correlation IDs, table/column names, and step-by-step technical narration. An executive brief states outcomes and decisions, not mechanism. If a technical detail is essential to justify a decision, translate it into plain business language rather than quoting it verbatim.

## Step 5 — State the dashboard's blocked/unblocked status explicitly

Every brief must say, in plain terms, whether the dashboard (or affected report/KPI) should remain blocked from publishing, has been unblocked, or is degraded-but-live. Base this strictly on the verdict in the source report(s) (e.g. a `data-quality-gate` BLOCK/PUBLISH verdict, or an `etl-failure-triage` escalation recommendation) — do not soften or override that verdict when restating it for leadership.

## Step 6 — Populate the brief using template.md

Use `template.md` as the exact structure for the final output. Fill each section from the source report(s) per Steps 2-5; do not add, remove, reorder, or rename sections. If a section has no verified content available, state that explicitly within the section (e.g. "Owner: Unassigned — not specified in source report") rather than omitting the section or leaving it blank.

## Constraints (non-negotiable)

- Do NOT invent financial impact, root cause, owner, or next-update timing not present in the source report(s).
- Do NOT include raw logs, stack traces, or unnecessary technical detail.
- Do NOT soften, omit, or override a BLOCK/escalation verdict from the source report(s).
- Do NOT commit any file and do NOT invoke or run this skill outside of drafting the brief document itself.

## Step 7 — Report results

Return the completed brief using every section from `template.md`, in the template's order: **Status, Business Impact, What We Know, What We Do Not Know, Decision or Action Needed, Owner, Next Update.**

Keep the brief concise and decision-oriented — leadership reads this in under a minute.
