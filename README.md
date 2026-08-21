# Product Selection Specialist Skill

一个可安装、可分享的抖音电商罗盘选品 Skill。v0.2.0 默认深挖固定五大类目的细分类目，在最新一期“图文直接成交榜 / 近1天”中寻找近3个完整自然日发布且明确新上榜的作品，并把同一商品的重复作品集中展示。

## v0.2.0 能做什么

- 先核验“抖店数据罗盘”身份、图文榜、近1天和最新榜单日期。
- 使用一次性固化的五大类目目录，日常运行不重复扫描类目菜单。
- 每个类目节点串行采集到 TOP200 或自然结束，不设商品数量上限。
- 唯一硬排除是最低可购买价大于 ¥1000；价格缺失保留并标记。
- 按商品 ID 分组，保留全部作品并识别“重复出现 / 重点复刻 / 高频爆款标的”。
- 从作品 ID 直接生成抖音链接，不检查链接有效性或内容违规。
- 输出一个可直接打开的 `选品结果-YYYY-MM-DD-近3日.html` 页面。

飞书/存储同步只有在用户明确要求时才运行，并继续使用接入项目原有的候选规则。

## 安装

### Codex

```bash
git clone https://github.com/xujp1983-glitch/product-selection-specialist-skill.git \
  ~/.codex/skills/product-selection-specialist
```

### 通用 Agent Skills

```bash
git clone https://github.com/xujp1983-glitch/product-selection-specialist-skill.git \
  ~/.agents/skills/product-selection-specialist
```

重新启动会话，使 Agent 重新读取 Skill 元数据。真实采集需要使用者提供已授权的数据罗盘浏览器或适配器；仓库不包含账号、Cookie、浏览器 Profile、私有接口或采集程序。

## 使用示例

```text
选品专员，跑我常用的5个类目，找近三天发布的新上榜图文，全部给我。
```

```text
选品专员，把重复出现的商品放到最上面的爆款雷达里，结果输出HTML。
```

```text
选品专员，更新细分类目；我授权你重新读取数据罗盘类目菜单。
```

## HTML 生成器

把适配器产出的标准 JSON 交给生成器：

```bash
node scripts/render_selection_html.mjs input.json --output-dir ./results
```

输入字段见 [`references/adapter-contract.md`](references/adapter-contract.md)。生成器无第三方依赖，使用 Node.js 22+。

## 验证

```bash
python3 scripts/validate_skill.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
node --test tests/*.test.mjs
```

## 项目结构

```text
.
├── SKILL.md
├── README.md
├── VERSION
├── CHANGELOG.md
├── evals/evals.json
├── references/
│   ├── adapter-contract.md
│   ├── category-catalog.yaml
│   ├── failure-handling.md
│   └── workflow.md
├── scripts/
│   ├── render_selection_html.mjs
│   └── validate_skill.py
└── tests/
    ├── render_selection_html.test.mjs
    └── test_skill_contract.py
```

## License

[MIT](LICENSE)
