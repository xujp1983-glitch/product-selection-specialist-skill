# Adapter Contract

The public skill contains methodology, not a private scraper. A real deployment supplies a browser/data adapter and may supply a storage adapter.

## Browser Or Data Adapter

The adapter should support these capabilities:

```text
select_identity(identity_name) -> observed_identity
open_ranking(ranking_name, period, category) -> page_state
collect_rows() -> collection_result
```

`page_state` should expose:

```text
observed_identity
platform
ranking_name
period
category
ranking_date
login_state
challenge_state
```

`collection_result` should expose:

```text
rows
pages_collected
reached_end
capture_time
warnings
```

Each row should expose the normalized fields listed in `SKILL.md`. Missing fields stay missing and carry an evidence status.

The adapter may use normal, authorized browser automation. It must not export session secrets, bypass access controls, or claim page state it cannot read back.

## Storage Adapter

Storage is optional and only runs after explicit user authorization.

```text
write_raw(rows, idempotency_key) -> raw_write_result
write_candidates(rows, policy_name, idempotency_key) -> candidate_write_result
```

Results should expose:

```text
inserted_count
existing_count
failed_count
failure_reasons
```

The adapter owns platform-specific field names. The skill owns the semantic distinction between raw rows, candidates, and recommendations.

## Required Failure Behavior

- If identity cannot be read back, return `identity_unverified`.
- If ranking state is stale or mismatched, return the observed and expected values.
- If collection ends because of a configured limit, return `reached_end=false`.
- If a write is partially successful, return per-row failures and preserve the idempotency key.
- Adapter exceptions must not be rephrased as zero matching products.

## Evidence Boundary

Keep credentials and raw session material inside the adapter's secure runtime. The skill should receive only normalized business fields and safe diagnostics.
