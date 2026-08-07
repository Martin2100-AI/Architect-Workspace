# ETL Triage Report — orders_ingest_daily

**Run correlation ID:** `b7e1a2f4-3c9d-4e2a-9f1b-2d6c8a0e5f31`
**Run date:** 2026-08-02 (23:00 UTC scheduled start)
**Environment:** Production
**Report date:** 2026-08-03

## 1. Incident Summary

The nightly `orders_ingest_daily` job (MSSQL `orders_raw` → `warehouse.orders`, which feeds the executive revenue dashboard) failed on 2026-08-02. All 3 configured retry attempts failed at the `map_region_code` transform step on the same row, and the job rolled back with 0 rows loaded despite 11 of 12 extracted rows having passed schema validation.

## 2. Evidence

- **Extract succeeded:** 12 rows extracted from `orders_raw_mssql` in 4456ms (log line 2).
- **Schema validation flagged one row:** `region = "LATAM"` on row `ORD-1012` is not in the expected enum (`US-East`, `US-West`, `EU-Central`, `EU-West`, `APAC`); 11/12 rows passed, 1 flagged (log line 3, `SchemaValidationError`, outcome `partial`).
- **Mapping step failed identically on all 3 attempts:** `MappingError` — "no mapping found for source region code 'LATAM' in region_code_map v12" — on attempts 1, 2, and 3 (log lines 4, 6, 8). Backoff was 5s then 10s; no input or config changed between attempts (metadata, Attempt summary table).
- **Retries exhausted:** `RetryExhausted` at attempt 3/3 (log line 9).
- **Full transaction rollback:** `load_orders` failed with `outcome: failure`, `rows_loaded: 0`, `transaction_state: rolled_back` (log line 10) — including the 11 rows that passed validation cleanly.
- **Reference table is stale relative to source data:** `region_code_map` v12 was last updated 2026-07-18 (metadata line 35); the offending value `LATAM` belongs to customer `Massive Dynamic`, onboarded 2026-08-01 under a `LATAM` regional designation in the source CRM (metadata line 51) — one day before this failure and two weeks after the lookup table's last update.
- **No pipeline or config changes coincide with the failure:** metadata line 52 states no changes were deployed to `orders_ingest_daily` or `region_code_map` between the 2026-08-01 success and the 2026-08-02 failure.
- **Prior runs (5-day history) were all successful** with 8–10 rows loaded each night (metadata Prior run history table); 2026-08-02 is the first failure in that window and the only one with 0 rows loaded.

## 3. Ranked Causes

1. **Stale reference/lookup table (`region_code_map` missing `LATAM` entry) — most likely.**
   Evidence: identical `MappingError` naming `region_code_map v12` and value `LATAM` on all 3 attempts (log lines 4, 6, 8); metadata confirms `v12` predates the 2026-08-01 CRM onboarding of `Massive Dynamic` under `LATAM` (metadata lines 34–37, 51). This matches the "Failed conversion / mapping step" fingerprint in `common-failures.md`: value passed schema validation (right type, plausible string) but has no corresponding lookup-table entry.

2. **Retry policy exhausted against a deterministic (non-transient) failure — contributing, not root cause.**
   Evidence: same `error_class`, same `unmapped_value`, same `row` on attempts 1–3 with only backoff timing differing (log lines 4–9; metadata Attempt summary table, "No configuration or input changed between attempts"). Per `common-failures.md`, retrying a data-shaped failure (missing lookup entry) cannot succeed without intervention — the retry loop consumed ~20s but could never have recovered the run. This explains *why the job kept trying* but not *why it failed*; ranked second because it's a downstream consequence of cause #1, not an independent trigger.

3. **All-or-nothing transaction design amplified a single bad row into a total data-loss run — secondary/design observation.**
   Evidence: `rows_loaded: 0` and `transaction_state: rolled_back` (log line 10) despite 11/12 rows passing schema validation (log line 3, metadata Row counts table). This isn't a cause of the failure itself, but it explains why one unmapped region code produced zero throughput instead of 11 successful loads plus one flagged row — worth noting because it affects blast radius and dashboard staleness, not the trigger.

No evidence in the log or metadata supports timeout/connection failure, auth/permission failure, or resource exhaustion — extract duration (4456ms) and row volume (12, in line with the 8–10 row prior-run range) are unremarkable, and no 401/403 or timeout-class errors appear anywhere in the log.

## 4. Next Tests

1. **For cause #1 (stale lookup table):** Query `region_code_map` directly (read-only) to confirm `v12` has no row for `LATAM`, and check whether a newer version exists that was never deployed. Separately, confirm with Sales Ops/CRM whether `Massive Dynamic` is the only account using the new `LATAM` designation or whether more source rows are likely to carry it on future runs.
2. **For cause #2 (retry exhaustion against deterministic failure):** No further test needed to confirm — the log already shows byte-identical error context across all 3 attempts. The open question is policy, not diagnosis: confirm whether `map_region_code` failures are intentionally configured to retry (vs. failing fast), since retrying a lookup-miss wastes ~20s per run without changing the outcome.
3. **For cause #3 (transaction scope):** Inspect the `load_orders` step's transaction boundary in the pipeline config/code (read-only review) to confirm whether it commits per-row or as a single all-or-nothing batch, and whether that is the intended behavior for this job.

## 5. Escalation Recommendation

**Escalate now.** This is a production pipeline feeding the executive revenue dashboard (metadata line 8), the run produced zero throughput for the day (a full data gap, not a degraded/partial one), and on-call was **not** auto-paged — the failure was only caught via manual nightly status check (metadata line 53). Per this repo's escalation criteria, a production data pipeline feeding a dashboard with a full-day data gap and a missed page is a strong, independent escalation signal regardless of how straightforward the root cause looks. Recommended immediate actions for a human: (a) add `LATAM` to `region_code_map`, (b) verify whether the missing auto-page is a monitoring gap that needs its own fix, both of which are code/config changes outside this triage's scope.
