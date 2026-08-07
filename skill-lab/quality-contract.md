# Quality Contract — Orders Dataset

Applies to: `skill-lab/orders.csv`

| Rule | Requirement |
|---|---|
| Key uniqueness | `order_id` must be unique — no duplicate values |
| Required field | `region` is required — must not be null or blank |
| Numeric rule | `revenue` must be greater than 0 |
| Freshness | `load_timestamp` must be less than 24 hours old at validation time |
| Expected volume | Row count must be at least 10 |
