---
name: data-quality-gate
description: Use when the user explicitly asks to validate a dataset, CSV, ETL output, query result, or dashboard/report source, or asks for a publish-readiness / PUBLISH-or-BLOCK decision on data before it ships. Triggers on requests like "validate this data", "is this ready to publish", "check data quality", "QA this export", "before this feeds the dashboard". Checks the data against a quality contract and returns PASS, WARN, or FAIL with evidence and a PUBLISH or BLOCK recommendation. Does NOT trigger for ordinary requests to write or debug SQL, calculate or define a metric, or design/build a dashboard's layout or visuals — those tasks alone are not data-quality-gate requests unless the user also asks for validation or a publish/block verdict.
---

# Data Quality Gate

## When this applies

Invoke this skill for: dataset/CSV/ETL-output validation, data-quality checks, and dashboard-or-report publish-readiness decisions. Do NOT invoke it just because a request touches data — writing a SQL query, calculating or defining a metric, or designing a dashboard's layout/visuals are separate tasks and do not by themselves call for a quality gate. Only invoke if the user is asking whether the data is correct/complete/fresh enough to ship, or explicitly wants a PUBLISH/BLOCK call.

## Step 1 — Require a dataset path

Ask for (or use, if already given) an explicit path to the dataset under review. Do not guess a path or scan the repo for "likely" candidates. If no path is provided, stop and request one.

## Step 2 — Locate the quality contract

Look for a supplied quality contract (a file the user names, or a `quality-contract.md` / `*-contract.md` alongside the dataset). If one is supplied, use its rules as the source of truth for every check below. If none is supplied, state clearly that defaults were used instead of a contract — see `references/quality-checks.md` for the fallback default rules.

## Step 3 — Read the dataset read-only

Read the dataset to inspect it. Never modify, reformat, sort, deduplicate, or otherwise write to the source data file at any point in this process, regardless of what issues are found.

## Step 4 — Run the checks

Evaluate each of the checks below against the contract (or defaults). **Read `references/quality-checks.md` before evaluating** — it has the full definition, evidence expectations, and edge-case handling for each check; this file only lists the check names.

- **Schema**
- **Freshness**
- **Expected volume**
- **Key uniqueness**
- **Duplicates**
- **Required fields**
- **Nulls**
- **Numeric rules**

Skip a check only if the contract explicitly has no rule for it, and say so in the evidence rather than omitting the row.

## Step 5 — Report results

Return a single table with these exact columns:

| Check | Evidence | Status | Recommended Action |
|---|---|---|---|

- **Evidence** must cite concrete values (row numbers, counts, specific offending values) — not a restatement of the rule.
- **Status** is PASS, WARN, or FAIL per row.
- **Recommended Action** is a specific next step (e.g., "dedupe rows 6 and 11 before reload", "backfill region on row 4").

## Step 6 — Final verdict

End the report with two explicit lines:

1. Overall result: **PASS**, **WARN**, or **FAIL** (FAIL if any check fails; WARN if any check warns and none fail; PASS only if every check passes).
2. Recommendation: **PUBLISH** or **BLOCK** (BLOCK on any FAIL; BLOCK or PUBLISH-with-caveats on WARN, at the assessor's judgment, stated explicitly; PUBLISH on all-PASS).

Keep the whole report concise and procedural — table plus verdict, no narrative padding.
