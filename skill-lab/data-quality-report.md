# Data Quality Report — orders.csv

**Dataset:** `skill-lab/orders.csv`
**Contract:** `skill-lab/quality-contract.md`
**Validated:** 2026-08-03 (read-only; source file not modified)

| Check | Evidence | Status | Recommended Action |
|---|---|---|---|
| Schema | Header (line 1) contains `order_id, order_date, customer_name, region, revenue, load_timestamp` — all columns referenced by the contract (`order_id`, `region`, `revenue`, `load_timestamp`) are present; no columns missing. | PASS | None. |
| Key uniqueness (`order_id`) | `ORD-1006` appears twice — line 7 (`order_date=2026-08-02`) and line 12 (`order_date=2026-08-03`). | FAIL | Investigate which `ORD-1006` record is authoritative; remove/merge the duplicate (lines 7 and 12) before reload. |
| Duplicates (full-row) | No two rows are fully identical — the two `ORD-1006` rows (lines 7 and 12) differ in `order_date` and `load_timestamp`, so this is a key collision, not a full duplicate. | PASS | None (see key uniqueness action above). |
| Required field (`region`) | Line 5, `ORD-1004`, has a blank `region` value (`,,`). | FAIL | Backfill `region` for `ORD-1004` (line 5) before reload. |
| Numeric rule (`revenue > 0`) | Line 6, `ORD-1005`, has `revenue = -150.00`. | FAIL | Correct or exclude `ORD-1005` (line 6); negative revenue is invalid before reaching the revenue dashboard. |
| Freshness (`load_timestamp` < 24h old) | Line 9, `ORD-1008`, has `load_timestamp = 2026-07-31T07:00:00Z`, ~3 days before the 2026-08-03 validation date. All other 11 rows carry `load_timestamp` values on 2026-08-03 and are within tolerance. | FAIL | Re-extract/refresh `ORD-1008` (line 9) with a current `load_timestamp` before reload. |
| Expected volume | 12 data rows present; contract requires a minimum of 10. | PASS | None. |
| Nulls (other columns) | No blank/null values found in `order_id`, `order_date`, `customer_name`, or `load_timestamp` across all 12 rows (only `region` on line 5 is blank, covered above). | PASS | None. |

## Verdict

1. Overall result: **FAIL**
2. Recommendation: **BLOCK**

Four independent contract violations (duplicate key, missing required field, non-positive revenue, stale timestamp) must be corrected and re-validated before this dataset feeds the executive revenue dashboard.
