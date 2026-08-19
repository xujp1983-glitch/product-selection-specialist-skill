# Discovery Workflow

## Data Flow

```text
Authorized Data Compass identity
  -> verify ranking / period / category / date
  -> collect stable ranking rows
  -> normalize evidence fields
  -> apply explicit user filters
  -> return a complete list
  -> optional storage adapter
  -> stop before verification and scoring
```

## Date Semantics

Treat these as independent values:

- `ranking_date`: the date represented by the Last 1 day ranking.
- `content_published_at`: the publication timestamp of the ranked post.
- `target_publish_date`: an optional date requested by the user.

With `Asia/Shanghai` as the business timezone, a run on 2026-08-19 normally expects a ranking date of 2026-08-18. A request for posts published on August 17 filters `content_published_at` to 2026-08-17; it does not change the expected ranking date.

## Newly Ranked Semantics

When the user explicitly requests newly ranked content, require a platform-provided new-entry marker. Rank increases, high sales, or a recent publication date are useful separate signals but do not prove a new entry.

If the source cannot expose a reliable new-entry marker, report that the condition cannot be verified.

## Full Results

`All` means every matching row in the proven collection range. The adapter must either:

1. prove it reached the final page; or
2. report the page/row limit and describe the output as complete only within the collected range.

Never hide rows because their rank is low or their content link is incomplete. Keep them and expose the evidence status.

## Candidate Policy

List mode does not apply an implicit candidate policy. Storage mode may use a named, disclosed policy supplied by the adopting project.

An example policy can require:

- content published within a declared freshness window;
- newly ranked content or a declared rank-increase threshold;
- a uniquely confirmed content link;
- product-ID deduplication.

Always report the exact policy and distinguish raw rows, unique products, and candidates. None of those automatically means recommended products.

## Link Fields

| Field | Meaning |
|---|---|
| `product_link` | Product detail destination |
| `content_link` | Ranked Douyin graphic post |
| `link_status` | `verified`, `missing`, `ambiguous`, or `unverified` |

Never synthesize links or substitute one link type for another.

## Serial Control

When multiple categories share one account or browser profile, process them serially. Human remote control and browser automation must not control the same profile at the same time.
