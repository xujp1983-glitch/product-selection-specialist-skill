#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PRICE_LIMIT = 1000;

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const stableText = (value) => String(value ?? '');

const safeHttpUrl = (value) => {
  const raw = stableText(value).trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
};

const domId = (value) => stableText(value).replace(/[^a-zA-Z0-9_-]/g, '-');

const rankValue = (entry) => {
  const value = Number(entry?.rank);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
};

const publishTimestamp = (entry) => {
  const value = Date.parse(entry?.work?.published_at ?? '');
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
};

const compareStableId = (left, right) => stableText(left).localeCompare(stableText(right), 'zh-CN', {
  numeric: true,
  sensitivity: 'base',
});

export function sortWorksByRank(works) {
  return Array.from(works ?? []).sort((left, right) => (
    rankValue(left) - rankValue(right)
    || publishTimestamp(right) - publishTimestamp(left)
    || compareStableId(left?.work?.id, right?.work?.id)
  ));
}

export function choosePrimaryWork(works) {
  return sortWorksByRank(works)[0] ?? null;
}

export function repeatTier(count) {
  if (count >= 5) return '高频爆款标的';
  if (count >= 3) return '重点复刻';
  if (count === 2) return '重复出现';
  if (count === 1) return '单次出现';
  return '待验证';
}

export function sortGroupsByRank(groups) {
  return Array.from(groups ?? []).sort((left, right) => (
    rankValue(left.primary_work) - rankValue(right.primary_work)
    || (right.repeat_count ?? right.works?.length ?? 0) - (left.repeat_count ?? left.works?.length ?? 0)
    || publishTimestamp(right.primary_work) - publishTimestamp(left.primary_work)
    || compareStableId(left?.product?.id, right?.product?.id)
  ));
}

function dateKey(value) {
  const match = stableText(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const key = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${key}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== key ? null : key;
}

function shiftDate(key, amount) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function numericPrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueRelationKey(entry, index) {
  const productId = stableText(entry?.product?.id).trim();
  const workId = stableText(entry?.work?.id).trim();
  return productId && workId ? `${productId}\u0000${workId}` : `__unkeyed__${index}`;
}

export function buildSelectionReport(input) {
  const rankingDate = dateKey(input?.meta?.ranking_date);
  if (!rankingDate) throw new Error('meta.ranking_date must be YYYY-MM-DD');
  const windowStart = shiftDate(rankingDate, -2);
  const seen = new Set();
  const deduplicated = [];
  let duplicateRelations = 0;

  for (const [index, source] of Array.from(input?.relations ?? []).entries()) {
    const key = uniqueRelationKey(source, index);
    if (seen.has(key)) {
      duplicateRelations += 1;
      continue;
    }
    seen.add(key);
    deduplicated.push(structuredClone(source));
  }

  const accepted = [];
  const unresolved = [];
  const summary = {
    source_relations: Array.from(input?.relations ?? []).length,
    duplicate_relations: duplicateRelations,
    price_excluded: 0,
    outside_window: 0,
    not_new: 0,
    unresolved: 0,
    qualified_relations: 0,
    unique_products: 0,
  };

  for (const entry of deduplicated) {
    const publishedDate = dateKey(entry?.work?.published_at);
    if (!publishedDate) {
      unresolved.push({ reason: '发布时间缺失或无法解析', entry });
      continue;
    }
    if (entry?.is_new !== true) {
      if (entry?.is_new === false) summary.not_new += 1;
      else unresolved.push({ reason: '缺少新上榜证据', entry });
      continue;
    }
    if (publishedDate < windowStart || publishedDate > rankingDate) {
      summary.outside_window += 1;
      continue;
    }
    const priceMin = numericPrice(entry?.product?.price_min);
    if (priceMin !== null && priceMin > PRICE_LIMIT) {
      summary.price_excluded += 1;
      continue;
    }
    if (!stableText(entry?.product?.id).trim()) {
      unresolved.push({ reason: '商品ID缺失，无法分组', entry });
      continue;
    }
    entry.publish_date = publishedDate;
    entry.price_status = priceMin === null ? '待验证' : '已读取';
    accepted.push(entry);
  }

  const grouped = new Map();
  for (const entry of accepted) {
    const productId = stableText(entry.product.id);
    if (!grouped.has(productId)) grouped.set(productId, []);
    grouped.get(productId).push(entry);
  }

  const groups = [];
  for (const worksInput of grouped.values()) {
    const works = sortWorksByRank(worksInput);
    const primary = choosePrimaryWork(works);
    const distinctIds = new Set(works.map((item) => stableText(item?.work?.id).trim()).filter(Boolean));
    const repeatCount = distinctIds.size;
    groups.push({
      product: structuredClone(primary.product),
      category_path: Array.from(primary.category_path ?? []),
      primary_work: primary,
      works,
      repeat_count: repeatCount,
      repeat_tier: repeatTier(repeatCount),
      price_status: works.some((item) => item.price_status === '待验证') ? '待验证' : '已读取',
    });
  }

  summary.unresolved = unresolved.length;
  summary.qualified_relations = accepted.length;
  summary.unique_products = groups.length;

  return {
    meta: {
      ...structuredClone(input.meta ?? {}),
      ranking_date: rankingDate,
      publish_window: [windowStart, rankingDate],
      price_rule: '最低可购买价 > ¥1000 排除；缺失保留并标记',
    },
    coverage: structuredClone(input?.coverage ?? []),
    failed_nodes: structuredClone(input?.failed_nodes ?? []),
    unresolved,
    summary,
    groups: sortGroupsByRank(groups),
  };
}

function workLink(entry) {
  const id = stableText(entry?.work?.id).trim();
  return id ? `https://www.douyin.com/video/${encodeURIComponent(id)}` : '';
}

function renderMetrics(metrics = {}) {
  return [
    ['成交/交易', metrics.transaction_amount],
    ['件数', metrics.sales_count],
    ['观看', metrics.views],
    ['点赞', metrics.likes],
  ].map(([label, value]) => `<span><b>${escapeHtml(label)}</b>${escapeHtml(value || '待验证')}</span>`).join('');
}

function renderWork(entry, expanded = false) {
  const contentLink = workLink(entry);
  const category = (entry.category_path ?? []).slice(0, 2).join(' / ');
  const search = [entry.work?.title, entry.work?.author, entry.work?.account, entry.work?.id].join(' ').toLowerCase();
  return `<div class="work ${expanded ? 'work-expanded' : ''}" data-publish-date="${escapeHtml(entry.publish_date)}" data-category="${escapeHtml(category)}" data-search="${escapeHtml(search)}">
    <div class="rank-tag">排名 ${escapeHtml(entry.rank ?? '待验证')}</div>
    <div class="work-copy">
      <strong>${escapeHtml(entry.work?.title || '（无标题）')}</strong>
      <span>${escapeHtml(entry.work?.author || '作者待验证')} · ${escapeHtml(entry.work?.account || '账号待验证')} · ${escapeHtml(entry.work?.published_at || '发布时间待验证')}</span>
      <div class="metrics">${renderMetrics(entry.metrics)}</div>
      <small>作品ID：${escapeHtml(entry.work?.id || '待验证')} · ${escapeHtml((entry.category_path ?? []).join(' / '))}</small>
    </div>
    <div class="actions">${contentLink ? `<a href="${escapeHtml(contentLink)}" target="_blank" rel="noopener noreferrer">抖音作品</a>` : '<span class="muted">作品链接待验证</span>'}</div>
  </div>`;
}

function renderGroup(group) {
  const productId = stableText(group.product?.id);
  const panelId = `works-${domId(productId)}`;
  const articleId = `product-${domId(productId)}`;
  const dates = [...new Set(group.works.map((item) => item.publish_date))].join(',');
  const categories = [...new Set(group.works.map((item) => (item.category_path ?? []).slice(0, 2).join(' / ')))].join('|');
  const productSearch = [group.product?.name, productId, group.product?.price_display].join(' ');
  const productLink = safeHttpUrl(group.product?.link);
  return `<article class="product" id="${escapeHtml(articleId)}" data-product-id="${escapeHtml(productId)}" data-dates="${escapeHtml(dates)}" data-categories="${escapeHtml(categories)}" data-repeat="${group.repeat_count}" data-product-search="${escapeHtml(productSearch.toLowerCase())}">
    <div class="product-main">
      <div class="rank-tag rank-primary">排名 ${escapeHtml(group.primary_work?.rank ?? '待验证')}</div>
      <div class="product-copy">
        <div class="product-heading"><h3>${escapeHtml(group.product?.name || '商品名称待验证')}</h3><span class="repeat repeat-${Math.min(group.repeat_count, 5)}">${escapeHtml(group.repeat_tier)} · ${group.repeat_count}个作品</span></div>
        <p>${escapeHtml(group.product?.price_display || '价格待验证')} · 商品ID ${escapeHtml(productId)} · ${escapeHtml(group.category_path.join(' / '))}</p>
        <p class="primary-title">代表作品：${escapeHtml(group.primary_work?.work?.title || '（无标题）')}</p>
        <div class="metrics">${renderMetrics(group.primary_work?.metrics)}</div>
      </div>
      <div class="actions product-actions">
        ${productLink ? `<a href="${escapeHtml(productLink)}" target="_blank" rel="noopener noreferrer">商品详情</a>` : '<span class="muted">商品链接待验证</span>'}
        ${workLink(group.primary_work) ? `<a href="${escapeHtml(workLink(group.primary_work))}" target="_blank" rel="noopener noreferrer">代表作品</a>` : ''}
        <button type="button" class="toggle" aria-expanded="false" aria-controls="${escapeHtml(panelId)}">全部作品 ${group.works.length}</button>
      </div>
    </div>
    <div class="works" id="${escapeHtml(panelId)}" hidden>${group.works.map((entry) => renderWork(entry, true)).join('')}</div>
  </article>`;
}

function coveragePath(item) {
  return Array.isArray(item?.category_path) ? item.category_path.join(' / ') : stableText(item?.category_path || item?.node || '待验证');
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}

export function renderSelectionHtml(report) {
  const repeated = report.groups.filter((group) => group.repeat_count >= 2);
  const categories = [...new Set(report.groups.flatMap((group) => group.works.map((entry) => (entry.category_path ?? []).slice(0, 2).join(' / '))))].filter(Boolean);
  const dates = [...new Set(report.groups.flatMap((group) => group.works.map((entry) => entry.publish_date)))].sort().reverse();
  const coverageRows = report.coverage.map((item) => `<tr><td>${escapeHtml(coveragePath(item))}</td><td>${escapeHtml(item.status || '待验证')}</td><td>${escapeHtml(item.attempts ?? '—')}</td><td>${escapeHtml(item.rows ?? item.relations ?? '—')}</td></tr>`).join('');
  const failedRows = report.failed_nodes.map((item) => `<li>${escapeHtml(coveragePath(item))}：${escapeHtml(item.reason || item.status || '读取失败')}</li>`).join('');
  const unresolvedRows = report.unresolved.map((item) => `<li>${escapeHtml(item.reason)} · 商品 ${escapeHtml(item.entry?.product?.id || '待验证')} · 作品 ${escapeHtml(item.entry?.work?.id || '待验证')}</li>`).join('');
  const initialProducts = report.groups.map(renderGroup).join('');
  const radar = repeated.length ? repeated.map((group) => `<a class="radar-item" href="#product-${escapeHtml(domId(group.product.id))}" data-jump-product="${escapeHtml(group.product.id)}"><b>${escapeHtml(group.repeat_tier)}</b><span>${escapeHtml(group.product.name)} · ${group.repeat_count}个作品 · 最佳排名${escapeHtml(group.primary_work.rank)}</span></a>`).join('') : '<p class="muted">本轮暂无重复商品。</p>';

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>选品稽核清单 · ${escapeHtml(report.meta.ranking_date)}</title>
<style>
:root{--paper:#F7F8F6;--ink:#17191A;--signal:#F0C62E;--line:#CDD2CF;--muted:#66706B;--white:#FFF;--danger:#9C372E;--display:"Arial Narrow","PingFang SC","Microsoft YaHei",sans-serif;--body:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;--utility:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:14px/1.5 var(--body)}a{color:inherit}.shell{width:min(1480px,calc(100% - 32px));margin:auto}.top{border-bottom:1px solid var(--line);background:var(--white)}.top .shell{display:flex;justify-content:space-between;gap:20px;align-items:end;padding:20px 0}.eyebrow{margin:0 0 4px;font:12px/1.4 var(--utility);letter-spacing:.14em;color:var(--muted)}h1{margin:0;font:800 clamp(24px,3vw,40px)/1.05 var(--display);letter-spacing:.02em}h2{margin:0 0 12px;font:800 18px/1.2 var(--display)}h3{margin:0;font:800 16px/1.3 var(--display)}.meta{text-align:right;color:var(--muted)}.toolbar{position:sticky;top:0;z-index:10;border-bottom:1px solid var(--line);background:rgba(247,248,246,.96)}.toolbar .shell{display:grid;grid-template-columns:minmax(220px,1fr) repeat(3,minmax(140px,auto)) auto;gap:8px;padding:10px 0}.toolbar input,.toolbar select,.toolbar button{min-height:38px;border:1px solid var(--line);border-radius:4px;background:var(--white);color:var(--ink);padding:0 10px;font:inherit}.toolbar button,.actions a,.actions button{cursor:pointer}.summary{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid var(--line);border-right:0;margin:18px 0;background:var(--white)}.stat{padding:14px;border-right:1px solid var(--line)}.stat b{display:block;font:800 25px/1.1 var(--utility)}.stat span{color:var(--muted)}.block{margin:18px 0;border-top:3px solid var(--ink);background:var(--white);padding:16px}.block-head{display:flex;justify-content:space-between;gap:16px;align-items:baseline}.block-head p{margin:0;color:var(--muted)}.radar{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.radar-item{display:flex;flex-direction:column;border:1px solid var(--line);padding:12px;text-decoration:none}.radar-item b{color:#6E5700}.audit-table{width:100%;border-collapse:collapse}.audit-table th,.audit-table td{padding:9px;border-bottom:1px solid var(--line);text-align:left}.audit-table th{font:12px/1.4 var(--utility);color:var(--muted)}.alert{color:var(--danger)}.product-list{border-top:1px solid var(--line)}.product{border-bottom:1px solid var(--line);background:var(--white)}.product-main,.work{display:grid;grid-template-columns:96px minmax(0,1fr) 220px;gap:14px;align-items:start;padding:14px}.rank-tag{display:inline-flex;width:max-content;min-width:74px;justify-content:center;background:var(--signal);padding:5px 8px;font:800 13px/1.4 var(--utility)}.rank-primary{font-size:15px}.product-heading{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.product-copy p{margin:4px 0;color:var(--muted)}.primary-title{color:var(--ink)!important}.repeat{border:1px solid var(--line);padding:2px 6px;font:12px/1.4 var(--utility)}.repeat-2,.repeat-3,.repeat-4,.repeat-5{border-color:var(--signal);background:#FFF8D7}.metrics{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px}.metrics span{color:var(--muted)}.metrics b{color:var(--ink);margin-right:5px}.actions{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap}.actions a,.actions button{border:1px solid var(--ink);border-radius:3px;background:var(--white);padding:7px 9px;text-decoration:none;font:inherit}.actions a:hover,.actions button:hover{background:var(--ink);color:var(--white)}:where(a,button,input,select):focus-visible{outline:3px solid var(--signal);outline-offset:2px}.works{border-top:1px dashed var(--line);background:#FBFCFA}.work{grid-template-columns:96px minmax(0,1fr) 130px;padding-left:34px}.work+.work{border-top:1px solid var(--line)}.work-copy{display:flex;flex-direction:column;gap:3px}.work-copy>span,.work-copy small,.muted{color:var(--muted)}.list{margin:8px 0 0;padding-left:20px}.empty{padding:48px 20px;text-align:center;background:var(--white)}.footer{padding:30px 0;color:var(--muted)}[hidden]{display:none!important}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media(max-width:900px){.toolbar .shell{grid-template-columns:1fr 1fr}.summary{grid-template-columns:repeat(2,1fr)}.radar{grid-template-columns:1fr}.product-main,.work{grid-template-columns:86px minmax(0,1fr)}.actions{grid-column:2;justify-content:flex-start}.meta{text-align:left}.top .shell{align-items:start;flex-direction:column}}@media(max-width:560px){.shell{width:min(100% - 20px,1480px)}.toolbar{position:static}.toolbar .shell{grid-template-columns:1fr}.summary{grid-template-columns:repeat(2,1fr)}.summary .stat:last-child{grid-column:1/-1}.product-main,.work{display:flex;flex-direction:column;padding:12px}.actions{justify-content:flex-start}.metrics{gap:7px 12px}}
</style>
</head>
<body>
<header class="top"><div class="shell"><div><p class="eyebrow">数据稽核清单 × 仓储货签</p><h1>近3日新上榜选品</h1></div><div class="meta">图文直接成交榜 / 近1天<br>榜单日 ${escapeHtml(report.meta.ranking_date)} · 发布窗口 ${escapeHtml(report.meta.publish_window[0])}—${escapeHtml(report.meta.publish_window[1])}<br>价格：最低可购买价 &gt; ¥1000 排除</div></div></header>
<div class="toolbar"><div class="shell"><input id="search" type="search" placeholder="搜索商品、作品、作者、账号或ID" aria-label="搜索"><select id="date-filter" aria-label="发布日期"><option value="">全部发布日期</option>${dates.map((date) => `<option value="${escapeHtml(date)}">${escapeHtml(date)}</option>`).join('')}</select><select id="category-filter" aria-label="类目"><option value="">全部类目</option>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}</select><select id="repeat-filter" aria-label="重复度"><option value="">全部重复度</option><option value="2">重复出现及以上</option><option value="3">重点复刻及以上</option><option value="5">高频爆款标的</option></select><button id="clear" type="button">清除筛选</button></div></div>
<main class="shell">
<section class="summary" aria-label="本轮汇总"><div class="stat"><b>${report.summary.unique_products}</b><span>入选商品</span></div><div class="stat"><b>${report.summary.qualified_relations}</b><span>作品—商品关系</span></div><div class="stat"><b>${repeated.length}</b><span>重复商品</span></div><div class="stat"><b>${report.summary.price_excluded}</b><span>高价排除</span></div><div class="stat"><b>${report.summary.unresolved}</b><span>待核记录</span></div></section>
<section class="block"><div class="block-head"><h2>重复爆款雷达</h2><p>仅统计本轮3日窗口内不同作品ID</p></div><div class="radar">${radar}</div></section>
<section class="block"><div class="block-head"><h2>覆盖稽核</h2><p>${report.failed_nodes.length ? '覆盖不完整，不得宣称全量' : '按固定类目目录执行'}</p></div><table class="audit-table"><thead><tr><th>类目节点</th><th>状态</th><th>尝试</th><th>关系数</th></tr></thead><tbody>${coverageRows || '<tr><td colspan="4" class="muted">未提供覆盖台账</td></tr>'}</tbody></table>${failedRows ? `<h3 class="alert">失败节点</h3><ul class="list alert">${failedRows}</ul>` : ''}${unresolvedRows ? `<h3>待核记录</h3><ul class="list">${unresolvedRows}</ul>` : ''}</section>
<section class="block"><div class="block-head"><h2>完整产品清单</h2><p id="visible-count">${report.groups.length}个商品，按最佳榜单排名升序</p></div><div id="product-list" class="product-list">${initialProducts}</div><div id="empty" class="empty" hidden><p>没有符合当前筛选的商品。</p><button id="empty-clear" type="button">清除筛选</button></div></section>
</main><footer class="footer shell">本页为单文件交付；商品链接与抖音作品链接可直接打开。作品链接由作品ID确定性生成，不执行有效性检查。</footer>
<script id="selection-data" type="application/json">${safeJson(report)}</script>
<script>
(()=>{const list=document.getElementById('product-list');const controls={search:document.getElementById('search'),date:document.getElementById('date-filter'),category:document.getElementById('category-filter'),repeat:document.getElementById('repeat-filter')};function apply(){const q=controls.search.value.trim().toLowerCase();const d=controls.date.value;const c=controls.category.value;const r=Number(controls.repeat.value||0);let visible=0;list.querySelectorAll('.product').forEach(product=>{const productMatch=!q||product.dataset.productSearch.includes(q);let visibleWorks=0;product.querySelectorAll('.work').forEach(work=>{const workMatch=(!d||work.dataset.publishDate===d)&&(!c||work.dataset.category===c)&&(!q||productMatch||work.dataset.search.includes(q));work.hidden=!workMatch;if(workMatch)visibleWorks+=1});const ok=visibleWorks>0&&(!r||Number(product.dataset.repeat)>=r);product.hidden=!ok;if(ok)visible+=1});document.getElementById('visible-count').textContent=visible+'个商品，按最佳榜单排名升序';document.getElementById('empty').hidden=visible!==0}function clear(){Object.values(controls).forEach(control=>control.value='');apply()}Object.values(controls).forEach(control=>control.addEventListener('input',apply));document.getElementById('clear').addEventListener('click',clear);document.getElementById('empty-clear').addEventListener('click',clear);list.addEventListener('click',event=>{const button=event.target.closest('.toggle');if(!button)return;const panel=document.getElementById(button.getAttribute('aria-controls'));const expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));panel.hidden=expanded});document.querySelectorAll('[data-jump-product]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();const product=list.querySelector('[data-product-id="'+CSS.escape(link.dataset.jumpProduct)+'"]');if(product)product.scrollIntoView({behavior:'smooth',block:'center'})}));})();
</script>
</body></html>`;
}

function parseArgs(argv) {
  const args = { input: null, outputDir: process.cwd(), output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!args.input && !value.startsWith('--')) args.input = value;
    else if (value === '--output-dir') args.outputDir = argv[++index];
    else if (value === '--output') args.output = argv[++index];
    else throw new Error(`unknown argument: ${value}`);
  }
  if (!args.input) throw new Error('usage: render_selection_html.mjs input.json [--output-dir DIR | --output FILE]');
  return args;
}

export function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const input = JSON.parse(readFileSync(resolve(args.input), 'utf8'));
  const report = buildSelectionReport(input);
  const output = args.output
    ? resolve(args.output)
    : resolve(args.outputDir, `选品结果-${report.meta.ranking_date}-近3日.html`);
  mkdirSync(resolve(output, '..'), { recursive: true });
  writeFileSync(output, renderSelectionHtml(report), 'utf8');
  process.stdout.write(`${output}\n`);
  return output;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
