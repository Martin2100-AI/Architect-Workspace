# Data Quality Report — orders.csv

Contract: `skill-lab/quality-contract.md`
Dataset: `skill-lab/orders.csv` (read-only, not modified)
Validation reference time: as of 2026-08-03

| Check | Evidence | Status | Recommended Action |
|---|---|---|---|
| Schema | Header contains order_id, order_date, customer_name, region, revenue, load_timestamp. All contract-referenced columns (order_id, region, revenue, load_timestamp) present; values parse as expected types. | PASS | None |
| Freshness | Row 9 (ORD-1008) load_timestamp = 2026-07-31T07:00:00Z — over 48h before validation reference time, exceeds the <24h rule. All other 10 rows carry 2026-08-03 timestamps and are within 24h. | FAIL | Investigate why ORD-1008 has a stale load_timestamp; reload or exclude the row before publish. |
| Expected volume | 11 data rows present (rows 2–12); contract requires ≥10. | PASS | None |
| Key uniqueness | order_id `ORD-1006` appears twice — row 7 (order_date 2026-08-02, load_timestamp 2026-08-03T10:00:00Z) and row 11 (order_date 2026-08-03, load_timestamp 2026-08-03T11:30:00Z). | FAIL | Investigate and dedupe the two ORD-1006 rows (7 and 11) before reload — determine which is the correct record. |
| Duplicates (full-row) | Rows 7 and 11 share order_id but differ in order_date and load_timestamp, so no fully identical rows exist. | PASS | None (key uniqueness failure above still stands independently) |
| Required fields | Row 5 (ORD-1004) has a blank `region` value. | FAIL | Backfill region on row 5 (ORD-1004) before reload. |
| Nulls | Only blank value found is region on row 5, already captured under Required fields. No contract tolerance stated for other columns beyond required-field rules. | INFO | None beyond the Required fields action above. |
| Numeric rules | Row 6 (ORD-1005) `revenue` = -150.00, violates the "revenue must be > 0" rule. | FAIL | Investigate negative revenue on ORD-1005; correct source value or exclude row before reload. |

## Verdict

**Overall result: FAIL** (4 checks failed: Freshness, Key uniqueness, Required fields, Numeric rules)

**Recommendation: BLOCK** — do not publish until ORD-1008 freshness, the ORD-1006 duplicate key, the blank region on ORD-1004, and the negative revenue on ORD-1005 are resolved.
