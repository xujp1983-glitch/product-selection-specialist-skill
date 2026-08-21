# Adapter And HTML Input Contract

The public skill contains methodology and a deterministic HTML renderer, not a private Data Compass scraper. A real deployment supplies an authorized browser/data adapter and may supply a storage adapter.

## Browser Or Data Adapter

The adapter should expose observable platform state and serial collection:

```text
select_identity(identity_name) -> observed_identity
open_ranking(ranking_name, period) -> page_state
select_category(category_path[]) -> observed_category_path
collect_to_top_200_or_end() -> node_collection
```

`page_state` should expose:

```text
observed_identity
platform
ranking_name
period
ranking_date
login_state
challenge_state
```

`node_collection` should expose:

```text
category_path[]
attempts
pages_collected
rows_collected
reached_top_200_or_end
status
failure_reason
relations[]
```

The adapter may use normal, authorized browser automation. It must not export session secrets, bypass access controls, or claim state it cannot read back.

## Renderer Input

`scripts/render_selection_html.mjs` accepts UTF-8 JSON:

```json
{
  "meta": {
    "ranking_date": "2026-08-20",
    "generated_at": "2026-08-21T09:00:00+08:00"
  },
  "coverage": [
    {
      "category_path": ["个护家清", "个人护理", "全部"],
      "status": "complete",
      "attempts": 1,
      "pages": 10,
      "rows": 200
    }
  ],
  "failed_nodes": [],
  "relations": [
    {
      "ranking_date": "2026-08-20",
      "category_path": ["个护家清", "个人护理", "身体清洁", "全部"],
      "rank": 12,
      "is_new": true,
      "product": {
        "id": "PRODUCT_ID",
        "name": "商品名称",
        "price_display": "¥99–¥129",
        "price_min": 99,
        "link": "https://haohuo.jinritemai.com/..."
      },
      "work": {
        "id": "WORK_ID",
        "title": "作品标题",
        "author": "作者昵称",
        "account": "作者账号",
        "published_at": "2026-08-19T12:36:00+08:00"
      },
      "metrics": {
        "transaction_amount": "¥2,500–¥5,000",
        "sales_count": "0–25",
        "views": "7.5万–10万",
        "likes": "100–250"
      }
    }
  ]
}
```

`ranking_date`, `category_path`, `rank`, `is_new`, `product.id`, `work.id`, and `work.published_at` must come from the source rather than inference. Missing optional display fields stay missing and are rendered as `待验证`.

`product.price_min` is the numeric lowest purchasable price. For a range, supply the lower bound. Use `null` when unreadable; the renderer keeps that product and marks the price for review.

## Renderer Output

```bash
node scripts/render_selection_html.mjs input.json --output-dir ./results
```

The script writes `选品结果-{ranking_date}-近3日.html`. Use `--output FILE` only when the caller needs a specific authorized destination.

The renderer:

- filters to the ranking date and preceding two dates;
- requires `is_new=true`;
- excludes only `product.price_min > 1000`;
- deduplicates `(product.id, work.id)` and keeps the first category path;
- groups by product, computes repetition, and sorts deterministically;
- constructs Douyin links from work IDs without opening them;
- renders product links only when their URI scheme is HTTP or HTTPS; missing or unsafe schemes are marked `商品链接待验证` without excluding the relation;
- embeds all data, CSS, and JavaScript into one HTML file.

## Storage Adapter

Storage is optional and runs only after explicit user authorization:

```text
write_raw(rows, idempotency_key) -> raw_write_result
write_candidates(rows, policy_name, idempotency_key) -> candidate_write_result
```

Results should expose `inserted_count`, `existing_count`, `failed_count`, and per-row failure reasons. The adopting project owns platform-specific fields and its candidate policy; this public skill keeps raw rows, user-list products, storage candidates, and recommendations semantically separate.

## Required Failure Behavior

- If identity cannot be read back, return `identity_unverified`.
- If ranking state is stale or mismatched, return observed and expected values.
- If a node stops early, return `reached_top_200_or_end=false` and a failure reason.
- Retry a healthy category node once; do not retry a platform-gate failure.
- If a write is partially successful, preserve the idempotency key and return per-row failures.
- Adapter exceptions must not be rephrased as zero matching products.

Keep credentials and raw session material inside the adapter's secure runtime. The skill receives only normalized business fields and safe diagnostics.
