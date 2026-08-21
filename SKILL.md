---
name: product-selection-specialist
description: Use this skill whenever a user asks to run Douyin E-commerce Data Compass product selection, scan the usual five categories or their fine-grained subcategories, find newly ranked graphic posts, identify products repeated across multiple posts, return a complete product list with Douyin and product links, generate the selection HTML page, or explicitly sync discovery data to configured storage such as Feishu. It governs discovery only and stops before Buyin verification, scoring, sample requests, merchant contact, or other business actions.
compatibility: Requires an authorized Data Compass browser or data adapter. The reusable HTML generator requires Node.js 22+. Storage sync additionally requires an explicitly configured storage adapter. Never assumes credentials, login state, selectors, or private APIs.
---

# Product Selection Specialist

## Purpose

Run a verifiable product-discovery workflow from Douyin E-commerce Data Compass. The default user-list workflow searches broadly for fresh, reproducible product opportunities, groups repeated products, and delivers one directly openable HTML file.

Discovery produces a screening list, not a business recommendation. Stop before Buyin verification, scoring, sample requests, merchant outreach, showcase/cart actions, or campaign decisions.

## Precedence And Modes

Explicit user values override matching defaults. Never override a named category, ranking, date window, price ceiling, output type, or result quantity silently.

### User List Mode

Use when the user asks to run rankings, find products, list all matches, inspect recent new entries, identify repeated products, or give the results to a director/editor for screening.

The v0.2.0 category, freshness, price, grouping, repetition, link, and HTML rules below are **仅适用于用户清单模式**.

### Storage Sync Mode

Use only when the user explicitly asks to sync, write, register, enter a candidate table, or write to 飞书.

- Keep the adopting project's existing raw-pool, candidate-policy, idempotency, recovery, and stopping rules unchanged.
- Disclose the candidate policy and report raw, candidate, existing, and failed counts.
- Stop after the configured candidate destination confirms the write.

User-list defaults do not silently replace an existing storage candidate policy. A request to view a list does not authorize storage writes.

## Default User-List Contract

| Setting | Default |
|---|---|
| Identity | Observable browser/profile identity `抖店数据罗盘` or the user's equivalent Data Compass identity |
| Ranking | `图文直接成交榜` |
| Period | `近1天` |
| Ranking date | Latest completed ranking, normally yesterday in `Asia/Shanghai` |
| Publication window | Ranking date and the preceding two dates: `近3个完整自然日` |
| New-entry evidence | `is_new=true` is mandatory |
| Categories | Five fixed anchors from `references/category-catalog.yaml` |
| Per-node range | `TOP200` or a proven natural end |
| Price rule | Exclude only when the lowest purchasable price is greater than `¥1000` |
| Quantity | No product count cap; return every qualified product in the proven range |
| Processing | One shared identity, serial category nodes |
| Artifact | `选品结果-YYYY-MM-DD-近3日.html` |

Do not query three historical daily rankings. Run only the latest completed `图文直接成交榜 / 近1天`, then filter its rows by the three-date publication window.

## Capability And Platform Gate

Before collecting rows, verify observable state in this order:

1. Read back the active browser/profile identity. It must be the intended Data Compass identity; an already open page is not proof.
2. Confirm the source is `compass.jinritemai.com`, not Buyin, an MCN surface, or another commerce product.
3. Confirm the selected ranking is `图文直接成交榜`, even if the route contains `rank-video`.
4. Confirm the period is `近1天` and the ranking date is the expected latest completed date.
5. Confirm the selected category path after every category change.
6. Confirm the page contains stable, non-empty ranking rows before traversal.

Stop the entire run if identity, login, CAPTCHA, permission, shared-session safety, ranking, period, or ranking date cannot be verified. Never reinterpret a platform failure as zero products.

## Fixed Category Catalog

Read [the fixed catalog](references/category-catalog.yaml) before a multi-category user-list run.

- Do not discover or enumerate categories during normal runs.
- Process the catalog anchors and their `third_level_categories` in file order.
- For `全部`, scan `[一级, 二级, 全部]` as the aggregate node.
- For every named third-level category, scan `[一级, 二级, 三级, 全部]`; the fourth level stays `全部`.
- Scan every configured node serially to `TOP200` or a proven natural end.
- If one configured node fails, retry it once, for two attempts total. If it still fails, record it as incomplete and continue only while the platform gate remains healthy.
- Never claim full coverage when any configured node is unresolved.

Only update the catalog when the user explicitly asks `更新细分类目` and either supplies category screenshots or authorizes a fresh Data Compass category read. Screenshots are evidence for maintaining the catalog, not a runtime dependency.

## Normalize Relations

Normalize each ranking relation to this portable shape before filtering:

```text
ranking_date
category_path[]
rank
is_new
product.id
product.name
product.price_display
product.price_min
product.link
work.id
work.title
work.author
work.account
work.published_at
metrics.transaction_amount
metrics.sales_count
metrics.views
metrics.likes
```

Also keep a coverage ledger for every configured category node: path, status, attempts, pages, collected rows, and failure reason.

## Filtering Rules

Apply these rules in order:

1. Require a parseable `work.published_at` date within the ranking-date three-day window.
2. Require the platform's explicit `is_new=true`; rank increases are not new-entry evidence.
3. Apply the sole business exclusion: `最低可购买价 > ¥1000`.

Price details:

- A single price greater than `¥1000` is excluded.
- A range uses its lower bound. Keep `¥999–¥1200`; exclude `¥1000.01–¥1200`.
- Missing or unreadable price is kept and marked `待验证`.

Do not filter by sales, transaction value, views, likes, rank, historical appearance, compliance, content-link validity, product-link validity, or any other undeclared criterion. Missing/unreadable publication date or missing new-entry evidence does not enter the qualified list; record it in the unresolved ledger.

## Deduplication, Grouping, And Repetition

1. Deduplicate the exact `(product.id, work.id)` relation.
2. If the same relation appears under multiple category nodes, keep the first-scanned category path only.
3. Group all remaining relations by `product.id`; display one product main row.
4. Keep every associated work in the expandable product area.
5. Count repetition using distinct `work.id` values from the current three-day run only. Do not accumulate old HTML or historical runs.

Repetition tiers:

| Distinct works | Label |
|---:|---|
| 1 | 单次出现 |
| 2 | 重复出现 |
| 3–4 | 重点复刻 |
| 5+ | 高频爆款标的 |

Repetition is a visibility signal for potentially reproducible content, not a hidden exclusion or a guarantee of future sales.

## Representative And Sorting Rules

- The best-ranked work is the product's representative work.
- Sort product rows by representative rank ascending.
- For equal representative rank, put the product with more distinct works first, then the newer representative publication time, then `product.id` for stability.
- Sort expanded works by rank ascending; for equal rank, use newer publication time, then `work.id`.

Do not preserve input order, group by date, or pick the newest work as representative when another work has a better rank.

## Link Rules

- `product.link` is the product detail destination. Capture it separately and do not validate whether it opens.
- If a 作品 ID exists, construct `https://www.douyin.com/video/{作品ID}` deterministically.
- Do **not open or validate（不打开验证）** the Douyin URL, title, author, date, compliance state, or link validity in user-list mode.
- Never substitute a product link for a Douyin work link.
- If a work ID or product link is missing, keep the otherwise qualified relation and mark that field `待验证`.

## HTML Delivery

User-list mode produces a new dated, standalone HTML artifact rather than Markdown. The chat reply contains only the result summary, coverage state, repetition counts, and a clickable link to the HTML file.

The HTML must contain:

- ranking date, three-day publication window, price rule, and qualified totals;
- coverage ledger, failed nodes, and unresolved rows;
- a top `重复爆款雷达` section;
- the complete product list, ordered by the sorting contract;
- product search, category/date/repetition filters, and a clear-filter action;
- one main row per product and every work in an expandable area;
- separate product-detail and Douyin-work links.

Use the reusable generator:

```bash
node scripts/render_selection_html.mjs input.json --output-dir /authorized/output/directory
```

The default filename is `选品结果-YYYY-MM-DD-近3日.html`. The generator implements the filtering, deduplication, grouping, repetition, sorting, link construction, and cold-white warehouse-audit design. Read [the input contract](references/adapter-contract.md) before generating.

### Explicit Legacy Text Override

If the user explicitly asks for the previous text format instead of HTML, honor that output override. Use Chinese-numbered full category headings and one fixed block per product, with a blank line between products:

```text
一、[完整类目路径]（N条）
排名[平台排名]｜[商品名称]｜售价¥[售价]
作品：[作品标题；空标题写“（无标题）”]
作者：[作者昵称]｜账号：[抖音号]｜发布：HH:MM
成交/交易：¥[金额区间]｜件数：[成交件数区间]｜观看：[观看次数区间]｜点赞：[点赞数区间]
商品ID：[商品ID]
[商品链接](商品详情URL)｜[抖音作品](抖音作品URL)（待验证）
```

Preserve source display units and write `待验证` for unavailable values. Do not claim a link was opened, valid, or compliant. This explicit override changes only presentation; the v0.2.0 three-day, category, filtering, grouping, and sorting rules still apply.

## Completeness And Failure Rules

- A healthy category-node failure gets one retry, then becomes a coverage failure; continue to later nodes.
- A platform-gate failure stops the entire run immediately.
- A source limit or failed node means `覆盖不完整`; return all qualified results from the proven range, but never call them platform-complete.
- Quantity is a target, not permission to relax categories, dates, `is_new`, or price.
- Report zero honestly. Do not backfill from older dates, other rankings, other categories, or historical files.

Read [failure handling](references/failure-handling.md) for the reporting contract.

## Safety Boundaries

- Never export cookies, tokens, passwords, browser profiles, private headers, or session data.
- Never bypass CAPTCHA, login checks, access controls, rate limits, or platform risk controls.
- Do not reverse-engineer or replay private platform requests to avoid normal access controls.
- Do not run multiple workers against one account or browser profile.
- Do not enter Buyin, score products, request samples, contact merchants, or take commercial action unless a later, separately authorized workflow governs it.

Evidence insufficiency and incomplete coverage are valid outcomes. Report them precisely.
