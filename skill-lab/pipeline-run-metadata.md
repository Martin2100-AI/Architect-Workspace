# Pipeline Run Metadata — orders_ingest_daily

**Run correlation ID:** `b7e1a2f4-3c9d-4e2a-9f1b-2d6c8a0e5f31`
**Job:** `orders_ingest_daily`
**Schedule:** Nightly, 23:00 UTC
**Environment:** Production
**Source:** `orders_raw_mssql` (MSSQL, `orders_raw` table)
**Target:** `warehouse.orders` (feeds the executive revenue dashboard)
**Run date:** 2026-08-02
**Status:** FAILED

## Attempt summary

| Attempt | Step reached | Result |
|---|---|---|
| 1 | `map_region_code` | Failed — no mapping for source value `LATAM` |
| 2 | `map_region_code` | Failed — identical error, no change in input |
| 3 (final, `max_attempts`) | `map_region_code` | Failed — identical error, retries exhausted |

Total attempts: 3 of 3 configured `max_attempts`. Backoff used: 5s, then 10s (exponential). No configuration or input changed between attempts.

## Row counts

| Stage | Count |
|---|---|
| Rows extracted | 12 |
| Rows passed schema validation | 11 |
| Rows flagged at schema validation | 1 (`ORD-1012`, `region = LATAM`) |
| Rows mapped | 0 |
| Rows loaded | 0 (transaction rolled back — no partial commit) |

## Reference data

- **`region_code_map` version at run time:** `v12`
- **`region_code_map` last updated:** 2026-07-18
- **Known enum in `v12`:** `US-East`, `US-West`, `EU-Central`, `EU-West`, `APAC`
- **Value seen but not in `v12`:** `LATAM` (row `ORD-1012`, customer `Massive Dynamic`)

## Prior run history (last 5 runs)

| Date | Status | Rows loaded |
|---|---|---|
| 2026-07-29 | SUCCESS | 9 |
| 2026-07-30 | SUCCESS | 10 |
| 2026-07-31 | SUCCESS | 8 |
| 2026-08-01 | SUCCESS | 10 |
| 2026-08-02 | **FAILED** (this incident) | 0 |

## Context notes

- Sales ops reports customer `Massive Dynamic` was onboarded as a new account on 2026-08-01 under a `LATAM` regional designation in the source CRM; this designation has not yet been reflected in `region_code_map`.
- No changes were deployed to `orders_ingest_daily` or `region_code_map` between the 2026-08-01 success and the 2026-08-02 failure.
- On-call was not paged automatically; this run's failure was surfaced via the nightly job status check.
