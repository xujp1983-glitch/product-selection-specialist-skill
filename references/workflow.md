# User-List Discovery Workflow

## Data Flow

```text
authorized Data Compass identity
  -> verify 图文直接成交榜 / 近1天 / latest completed ranking date
  -> load fixed category-catalog.yaml
  -> scan every configured node serially to TOP200 or proven end
  -> filter current ranking rows to the three-date publication window + is_new=true
  -> exclude only lowest purchasable price > ¥1000
  -> deduplicate relations and group by product ID
  -> compute current-run repetition and deterministic order
  -> render one dated standalone HTML file
  -> stop
```

Storage sync is a separate, explicitly authorized branch that keeps the adopting project's existing candidate policy.

## Date Semantics

Treat these as independent values:

- `ranking_date`: the date represented by the latest completed `近1天` ranking.
- `content_published_at`: the ranked graphic post's publication timestamp.
- `publish_window`: `ranking_date - 2 days` through `ranking_date`, inclusive.

With `Asia/Shanghai`, a run on 2026-08-21 normally uses ranking date 2026-08-20 and accepts publications dated 2026-08-18, 2026-08-19, or 2026-08-20. It does not open rankings for all three dates.

## Scan Plan From The Catalog

For each anchor in catalog order:

1. Scan its aggregate `[一级, 二级, 全部]` node.
2. For each named third-level category, scan `[一级, 二级, 三级, 全部]`.
3. Traverse to `TOP200` or a proven natural end.
4. Record coverage even when the node has zero rows.
5. Retry a failed node once. After two failed attempts, record it and continue only if identity, login, ranking, period, and ranking date remain healthy.

Normal runs never enumerate the live category menu. Category maintenance is a distinct user-authorized action.

## Filtering Decision Table

| Evidence | User-list result |
|---|---|
| Date is inside window, `is_new=true`, price lower bound ≤ ¥1000 | Keep |
| Date is inside window, `is_new=true`, price missing/unreadable | Keep; mark price `待验证` |
| Price lower bound > ¥1000 | Exclude as high price |
| Publication date is outside the window | Exclude as outside window |
| `is_new=false` | Exclude as not new |
| Publication date missing/unreadable | Do not qualify; add to unresolved ledger |
| New-entry evidence missing | Do not qualify; add to unresolved ledger |

Do not consult link validity, compliance, metrics, history, or content quality to make these decisions.

## Deduplication And First-Path Rule

The scan order is the evidence order. Deduplicate by exact `(product.id, work.id)` before grouping. When a relation repeats under later nodes, discard the later copy and keep the first-scanned category path.

Group qualified relations by `product.id`. The complete work array stays under the product even when its works came from different configured nodes.

## Repetition And Sorting

Count distinct work IDs within the current run:

- 2: `重复出现`
- 3–4: `重点复刻`
- 5+: `高频爆款标的`

The representative work is the best rank. Products sort by representative rank, distinct-work count descending, representative publication time descending, then product ID. Expanded works sort by rank, publication time descending, then work ID.

## Link Semantics

Keep the product detail URL from Data Compass. When a work ID exists, generate `https://www.douyin.com/video/{workId}`. The user-list workflow does not open either URL to test validity and does not analyze the content script.

## Completion Language

Use `覆盖完整` only when every configured node reached `TOP200` or a proven natural end. Otherwise use `覆盖不完整`, list failed nodes and attempts, and describe results as all qualified products within the proven range.
