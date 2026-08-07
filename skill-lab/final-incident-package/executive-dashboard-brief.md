# Executive Dashboard Brief — Orders Dashboard

**Date:** 2026-08-03
**Source report(s):** skill-lab/final-incident-package/data-quality-report.md, skill-lab/final-incident-package/etl-triage-report.md

## Status

**BLOCKED** — the orders dashboard's underlying data (`orders.csv` / `warehouse.orders`) failed quality validation and is not cleared to publish.

## Business Impact

Not yet quantified. No dollar or quantitative business impact figure was provided in the source reports.

## What We Know

- The data quality check on the orders dataset returned an overall **FAIL**, with a **BLOCK** recommendation, due to four separate issues: a duplicate order record, a missing region value, a negative revenue value, and one stale (outdated) record.
- Separately, the nightly pipeline that loads orders data into the warehouse failed on 2026-08-02 and loaded zero rows. The confirmed cause was a new customer's region code that did not yet exist in the system's region lookup table, which caused the load to fail after three retries and roll back.
- The pipeline failure was not automatically escalated to on-call — it was only noticed via a routine status check.
- The four data-quality issues found in `orders.csv` are not explained by the failed pipeline run (that run loaded 0 rows), meaning the file's origin and how it came to contain these specific defects is not yet established.

## What We Do Not Know

- Financial or business impact of the blocked dashboard.
- How or when `orders.csv` (the file that failed data-quality checks) was actually produced, since the logged pipeline run that same period loaded no data.
- Confirmed root cause for the duplicate record, missing region, negative revenue, and stale record found in `orders.csv` — only the separate pipeline mapping failure has a confirmed cause.
- Timeline for resolution.

## Decision or Action Needed

Keep the orders dashboard publish on hold. Leadership should confirm: (1) the pipeline's region-lookup gap is fixed and verified before the next run, (2) the alerting gap that let this failure go unpaged is addressed, and (3) the data engineering team investigates and confirms the source of `orders.csv` before any republish attempt.

## Owner

Unassigned — not specified in source report.

## Next Update

Not yet scheduled — not specified in source report.
