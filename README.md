# Product Selection Specialist Skill

一个可安装的 AI 选品方法 Skill，用于规范抖店数据罗盘的商品发现阶段。

它帮助 Agent 正确处理榜单日期、作品发布日期、新上榜标记、完整结果和作品链接证据，并在进入百应核验、评分或商务动作之前停止。

## 能解决什么

- 检查“图文直接成交榜 / 近1天”是否为最新榜单。
- 按类目采集榜单并保留可验证的原始字段。
- 精确筛选指定发布日期的新上榜作品。
- 用户要求“全部”时，不擅自缩减为 Top 5 或 Top 10。
- 分开记录商品详情链接和抖音作品链接。
- 对登录失效、验证码、旧榜单、链接缺失和数据不完整采用停止并报告策略。

## 不包含什么

这是方法 Skill，不附带任何人的账号、Cookie、浏览器 Profile、平台选择器、服务器配置或私有采集程序。它也不会自动执行百应核验、评分、申请样品、联系商家等动作。

要执行真实采集，使用者必须自行提供已授权的浏览器或数据适配器。接口要求见 [`references/adapter-contract.md`](references/adapter-contract.md)。

## 安装

### Codex / 通用 Agent Skills

```bash
git clone https://github.com/xujp1983-glitch/product-selection-specialist-skill.git \
  ~/.agents/skills/product-selection-specialist
```

重新启动 Agent 会话，使其重新读取 Skill 元数据。若你的工具使用其他 Skill 目录，把仓库克隆到对应目录即可。

## 使用示例

```text
选品专员，检查今天个护家清的图文直接成交榜是否更新，先不要写入。
```

```text
选品专员，跑常用5个类目，只要8月17日发布且平台标记为新上榜的作品，全部给我。
```

```text
选品专员，把每个商品对应的抖音作品链接和商品详情链接分开登记。
```

```text
选品专员，将通过既定候选规则的数据同步到已配置的候选表，到候选表后停止。
```

## 两种模式

### 用户清单模式

默认模式。采集和筛选真实数据，返回完整命中清单，不写外部系统。

### 存储同步模式

只有用户明确要求写入时启用。使用者需要自行配置存储适配器，并明确候选规则和幂等键。

## 关键语义

- **榜单日期**：榜单统计所属日期。
- **作品发布日期**：图文作品实际发布时间。
- **新上榜**：必须由平台的明确标记证明，不能用排名上涨替代。
- **全部结果**：已证明采集范围内的全部命中项，不是 Agent 主观挑选的少量结果。

## 验证

```bash
python3 scripts/validate_skill.py
```

成功时输出：

```text
validation passed
```

## 项目结构

```text
.
├── SKILL.md
├── README.md
├── evals/
│   └── evals.json
├── references/
│   ├── adapter-contract.md
│   ├── failure-handling.md
│   └── workflow.md
└── scripts/
    └── validate_skill.py
```

## License

[MIT](LICENSE)
