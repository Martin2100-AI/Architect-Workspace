# Quality Checks Reference

Detailed definitions for the checks run in Step 4 of `SKILL.md`. Read this file before evaluating checks against a contract — especially when the contract's wording is incomplete, ambiguous, or silent on a check.

## Schema

Confirm every column the contract references actually exists in the dataset header, no contract-required column is missing, and column contents are plausibly the right type (dates look like dates, numbers parse as numbers). An extra column the contract doesn't mention is not a failure by itself — note it as informational only if it looks like accidental leakage (e.g., an internal ID or PII column not in the contract).

## Freshness

Compare the dataset's load/update timestamp column against the contract's max-age rule and the validation time. If multiple rows carry different timestamps, check each row individually rather than only the newest or an aggregate — a single stale row is still a freshness failure for that row. State the validation reference time used (e.g., "as of 2026-08-03") so the evidence is reproducible.

## Expected volume

Compare total row count against the contract's stated minimum (and maximum, if given). Report the actual count next to the contract bound, not just "enough rows."

## Key uniqueness

Identify the contract's designated key column(s). Scan all values for duplicates. A duplicate key is a failure even if the duplicate rows differ in every other column — key collisions corrupt joins and aggregations downstream regardless of whether the rest of the row also matches.

## Duplicates

Separately from key uniqueness, check for rows that are fully identical across every column. This can pass even when key uniqueness fails (two rows can share a key but differ elsewhere) and vice versa. Always run both checks; don't treat one as a substitute for the other.

## Required fields

For each column the contract marks required, confirm no row has a null, empty-string, or whitespace-only value in that column. Cite the specific row(s) and column(s) affected.

## Nulls

Beyond contract-required fields, scan all columns for null/blank values and compare against any stated tolerance. If the contract states no explicit tolerance for a given column, note that the check ran but no contract threshold existed to fail against, and report the raw null count/rate as informational.

## Numeric rules

Apply any contract-stated numeric constraint (positive, non-negative, within a range, etc.) to every row in the relevant column. Cite the specific offending value(s) and row(s), not just "some rows fail."

## Fallback defaults (no contract supplied)

If no quality contract is found for the dataset, apply these generic defaults instead, and say explicitly in the report that defaults were used rather than a contract:

- Schema present (header row exists, columns are non-empty names)
- No nulls in obviously-key columns (e.g., an `id`-like or first column)
- No duplicate values in the first column (treated as a de facto key)
- Non-negative values in obviously-numeric columns (e.g., amounts, counts, revenue-like fields)

Defaults are intentionally conservative — they exist to catch gross breakage, not to replace a real contract. Recommend the user add a quality contract if one doesn't exist.
