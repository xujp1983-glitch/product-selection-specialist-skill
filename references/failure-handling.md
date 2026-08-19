# Failure Handling

## Platform-Level Stops

Stop the whole run when identity, login, access, ranking type, ranking period, or ranking date cannot be verified. Explain the business consequence first:

- `The active Data Compass identity could not be confirmed.`
- `The latest expected ranking is not available yet.`
- `The selected page is not the requested graphic ranking.`
- `The platform requested human verification.`

Do not ask the user to expose passwords, cookies, tokens, or browser-profile files.

## Category-Level Stops

A healthy shared session may continue to the next category when one category has:

- no accessible entry;
- unstable or malformed rows;
- missing product identifiers;
- ambiguous content links.

Say `no verifiable rows were obtained` instead of claiming the category has no products.

## Stale Ranking

Report both dates:

```text
Expected ranking date: YYYY-MM-DD
Observed ranking date: YYYY-MM-DD
Result: ranking not updated; no storage write performed
```

Do not reuse yesterday's checkpoint as today's discovery run.

## Incomplete Collection

When collection cannot prove the final page, report:

- pages and rows collected;
- the reason collection stopped;
- that results are complete only within the collected range.

## Link Problems

Keep the product row and mark the content link as missing, ambiguous, or unverified. Do not invent a link, use the product link as a substitute, or silently discard the row.

## Storage Problems

Preserve the same idempotency key and report inserted, existing, and failed counts. A retry should resume the same dataset rather than collecting a second copy.

## Quantity Shortfall

A requested quantity is a target, not permission to relax category, date, new-entry, or evidence conditions. Report the actual count and the filtering breakdown.
