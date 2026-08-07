---
name: etl-failure-triage
description: Use when the user asks why an ETL or ELT pipeline, scheduled load, SQL job, data refresh, or ingestion process failed or produced suspicious output. Reviews logs and run metadata, ranks likely causes, cites evidence, and recommends the next safe diagnostic steps.
---

# ETL Failure Triage

## When this applies

Invoke this skill when the user wants to know why a pipeline run, scheduled load, SQL job, data refresh, or ingestion process failed or produced suspicious output. Do NOT invoke it for ordinary requests to write a new pipeline, write SQL, design a dashboard, or calculate a metric — those are separate tasks unless the user is also asking for a failure diagnosis.

This skill diagnoses. It never fixes code and never reruns anything — see Constraints below.

## Step 1 — Require a log, run output, or failure description

Ask for (or use, if already given) a log file, raw run output, or a clear description of the failure/suspicious output. Do not guess at which log file is relevant or invent failure details. If nothing is supplied, stop and request it.

## Step 2 — Read run metadata when supplied

If a run-metadata file is supplied, or one exists alongside the log (e.g. `pipeline-run-metadata.md`, `run-metadata.*`), read it. Metadata carries facts a log alone often doesn't — schedule, source/target, row counts, attempt history, prior run outcomes — and is frequently what turns a hypothesis into an evidenced cause.

## Step 3 — Separate facts from hypotheses

A **fact** is something directly observed in the log or metadata (a specific error line, a row count, a timestamp, a status code). A **hypothesis** is an inference about why that fact occurred. Never let a hypothesis get reported as if it were a fact.

## Step 4 — Cite evidence for every likely cause

Every cause considered must point to a specific log line, timestamp, error class, or metadata field. A cause with no citation is not ready to report — either find the supporting evidence or drop it to a lower-confidence note.

## Step 5 — Rank likely causes

Order candidate causes from most to least likely, based on how directly the evidence supports each one. Read `references/common-failures.md` before ranking — it catalogs common ETL/ELT failure signatures (schema mismatch, mapping/conversion failure, retry exhaustion, timeout, auth/permission, resource exhaustion, upstream drift) and the evidence fingerprint typical of each, which speeds up matching this incident's evidence to a known pattern.

## Step 6 — Provide the next diagnostic step for each cause

For each ranked cause, state one concrete, safe next test that would confirm or rule it out (e.g. "inspect the region-code mapping table for the value seen in the log", "check upstream source schema for the affected column", "confirm whether the flagged customer record is new"). Diagnostic steps only — not fixes, not reruns.

## Constraints (non-negotiable)

- Do NOT modify any pipeline code, config, or mapping table.
- Do NOT rerun the job, trigger a retry, or execute the pipeline in any environment.
- Do NOT claim a root cause without a cited piece of evidence backing it.

## Step 7 — Report results

Return exactly these sections, in order:

1. **Incident Summary** — one or two sentences: what job, when, what happened.
2. **Evidence** — the specific facts pulled from the log/metadata (quote or cite line references).
3. **Ranked Causes** — most to least likely, each with its supporting evidence citation.
4. **Next Tests** — one safe diagnostic step per ranked cause.
5. **Escalation Recommendation** — whether this needs human/on-call escalation now, and why, per the project's escalation criteria (production data pipeline feeding a dashboard is a strong escalation signal on its own).

Keep the report concise and evidence-driven — no narrative padding, no speculation presented as fact.
