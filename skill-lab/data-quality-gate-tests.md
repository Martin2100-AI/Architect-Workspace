# data-quality-gate — Trigger Test Prompts

Manual test set for verifying the skill triggers reliably on data-validation / publish-readiness requests and stays silent on ordinary SQL, dashboard-design, or metric-calculation requests.

## Should TRIGGER

1. "Before this data feeds the executive revenue dashboard, validate skill-lab/orders.csv against skill-lab/quality-contract.md. Tell me whether I should PUBLISH or BLOCK the dataset."
2. "Can you QA the latest ETL export at exports/customers_2026-08-01.csv before we load it into the warehouse?"
3. "Is orders.csv ready to publish? Check it for duplicates, nulls, and stale timestamps first."

## Should NOT trigger

1. "Write a SQL query that joins orders and customers and returns total revenue by region."
2. "Design a dashboard layout to show weekly revenue trends for executives."
3. "Calculate the month-over-month growth rate for the revenue column in orders.csv."

## Expected output requirements

**When triggered:**
- Skill is invoked automatically (confirm in the final report).
- Dataset is read read-only; the source file is never modified, reformatted, sorted, or deduplicated.
- If a quality contract is found, its rules are used as source of truth; if not, the report states explicitly that fallback defaults were used instead.
- Report includes a single table with exact columns: `Check | Evidence | Status | Recommended Action`.
- Evidence cites concrete values (row/line numbers, counts, offending values) — not a restatement of the rule.
- Status is one of PASS, WARN, FAIL per row.
- Report ends with two explicit lines: overall result (PASS/WARN/FAIL) and recommendation (PUBLISH/BLOCK).
- Source dataset file is unchanged after the run.

**When NOT triggered:**
- The response addresses the SQL/design/metric task directly.
- No PASS/WARN/FAIL verdict, no PUBLISH/BLOCK recommendation, and no quality-contract lookup appear anywhere in the response.
- No dataset file is read for validation purposes as a side effect of the request.
