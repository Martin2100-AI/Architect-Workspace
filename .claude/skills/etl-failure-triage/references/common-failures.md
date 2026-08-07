# Common ETL/ELT Failure Signatures

Reference catalog for Step 5 of `SKILL.md`. Each entry lists the typical evidence fingerprint so an incident's log/metadata facts can be matched to a known failure pattern quickly. This is a matching aid, not a substitute for citing the actual evidence found in the incident under review.

## Schema mismatch

**Fingerprint:** A validation or extract step logs an unexpected column type, an unexpected/unmapped categorical value, a missing expected column, or a null in a column previously non-null. Often the first failure in the chain — later steps fail as a consequence.
**Typical metadata signal:** Row counts show fewer rows passed validation than were extracted; schema/contract version referenced in metadata is older than the source's actual current shape.
**Common root causes:** Upstream source added a new value/column without notice; a new customer/segment/region introduced a code not yet in a reference table; a source system migration changed a column's type.

## Failed conversion / mapping step

**Fingerprint:** A transform step logs a lookup miss, `KeyError`-style failure, or "no mapping found for value X" against a reference/lookup table. Distinct from schema mismatch: the input passed schema validation (right type, plausible value) but has no corresponding entry in a mapping/dimension table.
**Typical metadata signal:** Mapping/lookup table version noted in metadata predates the run; zero or partial rows reach the load step.
**Common root causes:** Reference/lookup table not updated to include a new code; typo or casing mismatch between source value and lookup key; mapping table load itself failed earlier in the same run.

## Retry exhaustion

**Fingerprint:** Multiple attempts logged with the same `error_class` and same offending value/context on each attempt; final attempt log line indicates max attempts reached with no change in outcome.
**Typical metadata signal:** `attempt` count equals `max_attempts`; no backoff or configuration change between attempts.
**Common root causes:** The underlying cause is deterministic (bad data, bad config, missing lookup entry) rather than transient (network blip, lock contention) — retrying an operation with a data-shaped cause will never succeed without intervention.

## Timeout / connection failure

**Fingerprint:** Log shows a connection attempt, then a gap approaching or exceeding a configured timeout value, then an explicit timeout or connection-reset error.
**Typical metadata signal:** `duration_ms` for the failing step is at or near the configured timeout ceiling.
**Common root causes:** Upstream system slow/unavailable, network partition, connection pool exhaustion, DNS resolution failure.

## Auth / permission failure

**Fingerprint:** 401/403-style error class, or an explicit "access denied"/"permission" message, usually on the first call to an external system in the run.
**Typical metadata signal:** Run coincides with a known credential rotation or expiry date.
**Common root causes:** Expired token/credential, revoked access, IP allowlist change, service account permission change.

## Resource exhaustion

**Fingerprint:** Out-of-memory, disk-full, or connection-pool-exhausted errors; often preceded by unusually large row counts or a runaway query in the same log.
**Typical metadata signal:** Row/volume counts in metadata are a significant outlier vs. prior runs.
**Common root causes:** Unexpected upstream volume spike, missing pagination/batching, a runaway or unbounded query, a resource leak from a prior run that didn't clean up.

## Upstream data drift

**Fingerprint:** No hard error at all — the job "succeeds" but downstream row counts, value distributions, or aggregates look implausible compared to historical runs.
**Typical metadata signal:** Row counts/volume in range, but distribution of a key column (e.g. region, category) shifts sharply vs. prior runs.
**Common root causes:** Upstream source silently changed its extraction logic, a filter condition changed, or a new data source was merged in without a corresponding pipeline update.
