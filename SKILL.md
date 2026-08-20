---
name: product-selection-specialist
description: Use this skill whenever a user asks to select products from Douyin E-commerce Data Compass rankings, inspect whether a ranking is fresh, find newly ranked graphic posts from a specified publication date, return all matching products, preserve product and content links, or sync validated discovery rows through a configured storage adapter. This skill governs the discovery stage only and must stop before Buyin verification, scoring, merchant outreach, sample requests, or other business actions.
compatibility: Requires an authorized Data Compass browser or data adapter. Optional storage requires an explicitly configured storage adapter. Never assumes credentials, login state, selectors, or private APIs are available.
---

# Product Selection Specialist

## Purpose

Run a verifiable product-discovery workflow from Douyin E-commerce Data Compass rankings. Preserve evidence, apply only declared filters, and report insufficiency honestly.

Discovery produces candidates, not recommendations. Stop before downstream identity verification, scoring, or business actions.

## Non-Negotiable Principles

1. Confirm the active identity, ranking, period, category, and ranking date before collecting rows.
2. Keep `ranking_date` separate from `content_published_at`.
3. When the user asks for newly ranked content, require the platform's explicit new-entry signal.
4. Keep `product_link` and `content_link` as separate evidence fields.
5. A request for all matches means all matches in the proven collection range, not an unrequested Top N.
6. Preserve rows with missing links and mark their evidence status; do not silently delete them.
7. Never claim that collection or storage occurred unless the required adapter actually ran successfully.

## Capability Check

Before acting, determine which capabilities are available:

- **Browser/data adapter:** can open or query Data Compass and return structured ranking rows.
- **Identity verification:** can select and read back the intended Data Compass identity or profile.
- **Storage adapter:** can optionally write raw rows or candidates to the user's configured system.

If a required capability is unavailable, stop at that boundary and explain what is missing. Do not invent results, links, login state, or write counts.

Read [the adapter contract](references/adapter-contract.md) before integrating with a concrete project.

## Default Business Contract

| Setting | Default |
|---|---|
| Platform | Douyin E-commerce Data Compass |
| Ranking | Graphic Direct Conversion Ranking |
| Period | Last 1 day |
| Unspecified category | Personal Care & Home Cleaning |
| Result order | Original platform rank ascending |
| List-mode storage | No write unless explicitly requested |
| Downstream verification | Never automatic |

User-specified values override matching defaults. Do not silently switch graphic content to video, live commerce, or product-only rankings.

## Work Modes

### User List Mode

Use when the user asks to inspect, collect, list, find a publication date, return all matches, or let the user screen the results.

- Collect real ranking data through the available adapter.
- Apply only the user's explicit filters.
- Do not apply private candidate policies, historical deduplication, or link-quality elimination unless requested.
- Do not write to external storage unless explicitly authorized.

### Storage Sync Mode

Use only when the user explicitly asks to sync, write, register, or enter a candidate table.

- Write raw and candidate records only through the configured adapter.
- State the policy used to generate candidates.
- Report idempotency and duplicate handling.
- Stop after the candidate destination confirms the write.

Storage Sync Mode does not authorize verification, scoring, recommendation cards, cart actions, sample requests, or merchant contact.

## Parse The Request

Resolve the request into this execution contract:

```text
mode=user_list | storage_sync
categories=[...]
ranking=graphic_direct_conversion
period=last_1_day
expected_ranking_date=YYYY-MM-DD
target_publish_date=YYYY-MM-DD | not_set
require_new=true | false
return_all=true | false
candidate_policy=not_set | declared_policy_name
```

Use the platform's business timezone, normally `Asia/Shanghai`. If a month and day omit the year, anchor it to the ranking date and choose the most recent matching date that is not later than the ranking date. Ask for clarification only when the date cannot be resolved safely.

## Verify The Page Or Data Source

Before collecting rows, verify observable state:

1. The active identity is the intended Data Compass identity.
2. The source is Data Compass, not Buyin or another commerce surface.
3. The selected ranking is Graphic Direct Conversion Ranking.
4. The period is Last 1 day.
5. The selected category matches the request.
6. The ranking date matches the expected date.
7. The source contains stable, non-empty rows.

An open page, a familiar URL, or a previous login does not prove current identity or ranking state. If state cannot be read back, stop rather than guessing.

## Collect And Normalize

Collect categories serially when one browser identity is shared. Normalize each row to:

```text
category
ranking_name
ranking_period
ranking_date
platform_rank
product_id
product_name
product_price
product_link
content_title
content_link
content_published_at
creator_name
creator_account
is_new
rank_change
pay_amount_range
transaction_amount_range
paid_item_count_range
view_count_range
like_count_range
capture_time
link_status
```

Keep source values and evidence status. Do not replace missing values with estimates.

Read [the workflow reference](references/workflow.md) for filtering and completeness rules.

## Apply Explicit Filters

- A target publication date compares against the date portion of `content_published_at` in the business timezone.
- `newly ranked` requires `is_new=true` from the platform.
- A rank increase is not a substitute for newly ranked content when the user explicitly requires new entries.
- Do not add price, sales, rank, history, or link-quality thresholds unless the user asked for them or selected a named candidate policy.
- Sort results by the platform's original rank for presentation only.

If the user asks for all matches, traverse until the adapter proves the end of the ranking. If a page limit, rate limit, or source error prevents that proof, say `all matches within the collected range` and report the limitation.

## Link Evidence

- `content_link` points to the ranked Douyin post.
- `product_link` points to the product detail page.
- Never use one as a substitute for the other.
- Keep a row whose content link is missing or ambiguous and set `link_status` to `missing`, `ambiguous`, or `unverified`.
- Never construct a guessed content URL.

## Output Contract

Users inspect these posts one by one, so the default response uses Chinese-numbered category groups and fixed item blocks. Start with one sentence stating the ranking, ranking date, target publication date, and total matches. Do not replace the item blocks with a compact table unless the user explicitly requests a table.

Use the full Data Compass category path and preserve the requested category order:

```text
一、[完整类目路径]（N条）
```

Use this exact field order for every result and leave one blank line between products:

```text
排名[平台排名]｜[商品名称]｜售价¥[售价]
作品：[作品标题；空标题写“（无标题）”]
作者：[作者昵称]｜账号：[抖音号]｜发布：HH:MM
成交/交易：¥[金额区间]｜件数：[成交件数区间]｜观看：[观看次数区间]｜点赞：[点赞数区间]
商品ID：[商品ID]
[商品链接](商品详情URL)｜[抖音作品](抖音作品URL)（可打开/异常/待验证）
```

Preserve Data Compass display units, for example `¥2,500–¥5,000` and `7.5万–10万`. When pay and transaction ranges match, combine them as `成交/交易`; when they differ, write `成交：...｜交易：...`. Write `待验证` for an unavailable value instead of estimating it.

When the user requests N products per category, count distinct `product_id` values and retain the highest-ranked post as the representative for a duplicate product. When the user requests all posts, preserve every matching post without product-level deduplication.

For large results, a complete CSV or Markdown artifact may accompany the response, but the message still uses these item blocks and its totals must match the artifact. Do not show only the first few rows. Keep zero-match categories as `（0条）`.

When storage was requested, append raw write count, candidate write count, duplicate count, and the exact stopping point.

## Stop Conditions

Stop the whole run when:

- identity cannot be confirmed;
- login, CAPTCHA, permission, or rate-limit barriers appear;
- the shared profile is under simultaneous human or automation control;
- the browser/data adapter is unavailable;
- the actual ranking or period is wrong;
- the ranking date is stale.

A category-specific parsing problem may stop only that category if the shared platform session remains healthy.

Read [failure handling](references/failure-handling.md) for reporting language.

## Safety Boundaries

- Do not export cookies, tokens, passwords, browser profiles, private headers, or session data.
- Do not bypass CAPTCHA, login checks, access controls, rate limits, or platform risk controls.
- Do not reverse-engineer or replay private platform requests to avoid normal access controls.
- Do not infer a product identity from ambiguous evidence.
- Do not add products to carts or showcases, request samples, contact merchants, or make business decisions.
- Do not run multiple workers against one account or browser profile.

Evidence insufficiency is a valid result. Report it clearly and stop.
