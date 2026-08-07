# ETL Failure Triage — orders_ingest_daily

## 1. Incident Summary

The `orders_ingest_daily` nightly job (run correlation ID `b7e1a2f4-3c9d-4e2a-9f1b-2d6c8a0e5f31`, scheduled 2026-08-02 23:00 UTC, target `warehouse.orders`) failed after exhausting 3 retry attempts on a region-code mapping step, rolled back its transaction, and loaded 0 rows.

## 2. Evidence

- `job_start` at `2026-08-02T23:00:00.102Z`, source `orders_raw_mssql`, target `warehouse.orders` (log line 1).
- `extract_orders` succeeded: 12 rows extracted (log line 2; metadata "Row counts" table).
- `schema_validate` logged `outcome:"partial"`, `error_class:"SchemaValidationError"`: column `region`, offending value `LATAM`, offending row `ORD-1012`, 11 rows passed / 1 flagged (log line 3).
- `map_region_code` failed 3 times with identical `MappingError`: "no mapping found for source region code 'LATAM' in region_code_map v12", row `ORD-1012`, attempts 1–3 (log lines 4, 6, 8).
- `retry_exhausted` at attempt 3/3 (log line 9); metadata confirms no config or input changed between attempts, backoff 5s then 10s.
- `load_orders` failed with `error_class:"UpstreamUnavailable"`, `reason:"transform_stage_incomplete"`, `rows_loaded:0`, `transaction_state:"rolled_back"` (log line 10).
- `job_failed` — final state `rows_extracted:12`, `rows_loaded:0` (log line 11).
- Metadata: `region_code_map` v12 last updated 2026-07-18; known enum is `US-East, US-West, EU-Central, EU-West, APAC` — `LATAM` is not a member.
- Metadata context notes: customer `Massive Dynamic` was onboarded 2026-08-01 in the source CRM under a `LATAM` designation not yet reflected in `region_code_map`.
- Metadata prior-run history: 2026-07-29 through 2026-08-01 all `SUCCESS` (8–10 rows loaded each); 2026-08-02 is the first failure in the last 5 runs.
- Metadata: "No changes were deployed to `orders_ingest_daily` or `region_code_map` between the 2026-08-01 success and the 2026-08-02 failure."
- Metadata: on-call was not auto-paged; failure surfaced via nightly job status check.

**Discrepancy noted (fact, not resolved by this log):** this log/metadata pair documents a full-job failure with **0 rows loaded** to `warehouse.orders` on 2026-08-02. It does not explain the specific defects found in `skill-lab/orders.csv` during data-quality validation — duplicate `order_id` `ORD-1006`, blank `region` on `ORD-1004`, negative `revenue` on `ORD-1005`, or the stale `load_timestamp` on `ORD-1008`. Notably, `orders.csv` contains `ORD-1012` with `region = EU-Central` (not the logged `LATAM`) and carries `load_timestamp` values from 2026-08-03, one day after this failed run. This log does not establish how or when `orders.csv` was produced, so no causal link between this incident and the CSV's other defects can be claimed as fact.

## 3. Ranked Causes

1. **Failed conversion / mapping step — unmapped region code** (evidence: log lines 3–9; metadata reference-data section). Directly cited, high confidence. `region_code_map` v12 (last updated 2026-07-18) has no entry for `LATAM`, introduced by a new customer (`Massive Dynamic`, onboarded 2026-08-01) whose CRM region designation was never added to the lookup table.
2. **Retry exhaustion is a symptom, not an independent cause** (evidence: log lines 5, 7, 9; metadata "no configuration or input changed between attempts"). The underlying cause is deterministic (a missing lookup entry), so retrying without updating `region_code_map` could never succeed — consistent with the "Retry exhaustion" fingerprint in the reference catalog.
3. **Unexplained: provenance of `skill-lab/orders.csv`'s other defects** (duplicate key, blank region, negative revenue, stale timestamp). No log or metadata evidence ties these to the 2026-08-02 `orders_ingest_daily` failure — this run loaded 0 rows. This is flagged as an open question, not a ranked/evidenced cause.

## 4. Next Tests

1. For the mapping failure: inspect `region_code_map` (v12 and any newer version) for a `LATAM` entry, and confirm with sales ops/CRM whether `Massive Dynamic`'s region designation is finalized as `LATAM` or should map to an existing enum value.
2. For retry exhaustion: confirm no intermediate manual or automated update to `region_code_map` occurred between attempts 1–3 within the same run (metadata already states none did — verify against the table's own change log if one exists).
3. For the CSV provenance discrepancy: identify what process produced `skill-lab/orders.csv` and when (check for a later successful run, a manual export, or a backfill/patch job) — since `orders_ingest_daily`'s 2026-08-02 run loaded 0 rows, `orders.csv` must originate from a different or later process that itself needs its own run log reviewed before the duplicate-key, blank-region, negative-revenue, and stale-timestamp defects can be explained.

## 5. Escalation Recommendation

**Escalate now.** This is a production data pipeline feeding the executive revenue dashboard (`warehouse.orders` → dashboard, per metadata line 8), the 2026-08-02 run fully failed with 0 rows loaded, and on-call was **not** auto-paged (metadata line 53) — a gap in the alerting path itself. Per CLAUDE.md escalation criteria, a production pipeline failure feeding a dashboard is a strong escalation signal on its own, independent of the still-unexplained CSV-level defects. Escalation should cover both (a) the `LATAM` mapping gap and (b) the missing page/alert, plus the unresolved provenance question in the current data-quality report.
