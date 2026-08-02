---
name: my-learn
description: 召回并积累当前项目中可跨任务复用、稳定且非显然的调研结论、需求、架构取舍、用户纠错、项目约定和 debug 经验。用户调用 $my-learn、$my-learn setup，询问"之前为什么这样做/是否踩过这个坑"，或预计本次工作会产生上述持久知识时使用；一次性或本机配置、机械性维护、简单查询、照单执行和容易重新发现的事实默认不触发。
---

# 项目经验积累

把项目 memory 当作可维护的检索入口，而不是聊天归档。优先帮助当前任务复用已有结论，再把本次新增的稳定知识写回全局 memory 或项目唯一真相源。

## 1. 先过持久化门槛

除用户显式调用 `$my-learn` 或 `$my-learn setup` 外，先判断本次任务是否值得占用长期 memory。只有预计会产生或复用以下内容时才进入后续流程：

- 会持续影响未来任务的需求、边界、验收标准或项目约定；
- 已收敛且需要保留理由、代价或适用范围的决策；
- 有可靠证据、以后可能避免重复调研的结论；
- 经过反复试错才确认的非显然根因、失败边界或可靠路径；
- 用户对未来行为作出的明确纠正。

以下任务默认完全跳过本 skill，不读取 memory、不创建条目，也不在收尾时报告：

- 一次性、本机专用或容易撤销的配置，例如编辑器偏好、临时环境变量、路径、开关、账号绑定和只适用于当前机器的安装设置；
- 机械性维护，例如安装、更新、卸载、改名、格式化、生成文件、版本号调整、提交、推送、发布或执行用户给定的明确命令；
- 简单查询、状态检查、内容转写，以及从当前代码或文档可低成本直接回答的问题；
- 原因明显、无需多轮试错的临时故障，或只服务当前会话的 workaround；
- 虽然耗时或修改文件较多，但没有形成跨任务可复用知识的工作。

不要因为任务涉及"配置"、调用了工具、进行了搜索或看起来复杂，就自动启用本 skill。拿不准时默认跳过；若任务中途意外发现了稳定、非显然且很可能复用的结论，再从发现点开始启用，必要时补做相关召回。

## 2. Memory 位置与全局约定

**全局唯一真相源**：`~/.agents/memory/`（独立 git 仓，push 到 GitHub private）。
**项目层不保留任何 memory 文件**——全局路径由各项目 `AGENTS.md` / `CLAUDE.md` 声明（chezmoi 模板统一处理）。

详细约定见 [[~/.agents/memory/personal/memory-location-convention]]。

**索引文件名**：用 `INDEX.md`，不用 `MEMORY.md`——`MEMORY.md` 是 Claude Code / pi 等工具默认识别名，会被 auto-memory 机制接管。

## 3. 6 维度分类（写入前先问）

每条 memory 写到全局对应子目录：

```
1. 个人偏好？         → personal/
2. 工作方法/流程？    → methodology/
3. 通用工程 gotcha？  → common/
4. 特定工具/库的坑？   → external/
5. 跨项目领域知识？    → domains/<field>/
6. 只此一项目用？      → projects/<github-id>/<repo>/
```

前 5 个是跨项目维度，第 6 个是项目维度。换项目还能用 → 跨项目；只本项目用 → projects。

判断更细的 `metadata.type` 字段保留原 5 档（`requirement | decision | research | pitfall | convention`），与维度正交。

## 4. 选择模式

### Setup

用户调用 `$my-learn setup` 时执行一次性接入：

1. 定位最近的 Git 根；不在 Git 仓库时使用当前 workspace 根。
2. 完整读取适用的 `AGENTS.md`、`CLAUDE.md`、`.gitignore`。
3. 读取 [`assets/agents-rule.md`](assets/agents-rule.md)，根据现有协议生成完整变更预览。
4. 一次展示并确认：
   - 全局 `~/.agents/memory/` git 仓是否存在；没有则建议 `git init` + remote + GitHub private；
   - 项目 `AGENTS.md`（或 `CLAUDE.md`）是否声明了"全局 memory 在 `~/.agents/memory/`"；
   - 是否需要同步现有的 AGENTS/CLAUDE 兼容关系。
5. 只有用户确认后才执行预览中的变更。

Setup 必须遵守：

- 已有项目协议优先；不要静默覆盖或迁移既有 memory。
- 已存在正确的 `CLAUDE.md -> AGENTS.md` symlink 时只修改 `AGENTS.md`。
- 两个独立指令文件存在实质冲突时停止，请用户确定唯一真相源。
- 使用 `<!-- my-learn:start -->` / `<!-- my-learn:end -->` 标记规则块；重复运行只更新该块，不追加副本。
- 不在项目层创建 `.agents/memory/` 目录或文件——所有 memory 走全局。
- 不把机器绝对路径写入可提交文件。

### Recall and capture

其他触发场景使用常规流程：

1. 主线工作前召回相关 memory。
2. 正常完成调研、设计、实现或排错，不为了记忆打断任务。
3. 结束前筛选候选，更新正式文档或 memory。
4. 仅在无法化解的实质矛盾出现时询问用户。

显式调用 `$my-learn` 且没有其他任务时，复盘当前可见的实质对话与已验证证据；不要读取外部会话日志来补齐上下文。

## 5. 召回

1. 读项目 `AGENTS.md`（或 `CLAUDE.md`）确认全局 memory 路径在 `~/.agents/memory/`。
2. 读全局 `~/.agents/memory/INDEX.md`；目录或索引不存在时视为尚无历史，不报错、不在召回阶段擅自初始化。
3. 用任务关键词、精确错误文本、组件、文件名、符号和技术名搜索全局 INDEX.md 的 6 维度分组。
4. 只打开最相关的少量条目；不要一次加载整个目录。
5. 将 memory 作为线索：
   - 易漂移且可低成本验证的事实，先从当前代码、测试或一手来源复核；
   - 与当前仓库状态冲突时，以当前证据为准，并在沉淀阶段处理旧条目；
   - 不把历史结论伪装成已经实时验证的事实。

如果代码、测试、正式文档或可用的 code graph 已能低成本回答问题，优先使用它们；memory 只补充"为什么"、失败边界或定位入口。

## 6. 收集候选

在工作过程中静默留意以下类型（frontmatter `metadata.type` 字段）：

| type | 应记录 | 不应记录 |
|---|---|---|
| `requirement` | 会影响后续任务的行为、边界、验收标准和用户纠错 | 一次性执行指令、临时进度 |
| `decision` | 已明确的架构选择、替代方案、理由与代价 | 尚未收敛的随口设想 |
| `research` | 有一手来源支撑的结论、版本边界、对比与冲突 | 未打开的搜索结果、无来源转述 |
| `pitfall` | 非显然根因、误导性症状、失败条件和快速定位方式 | 可直接从错误文本或代码看出的细节 |
| `convention` | 项目特有且会反复影响实现的约定 | 通用常识或已被自动检查强制的格式 |

以下任一情况通常值得保留：

- 用户明确纠正了未来仍适用的行为；
- 调研改变了选型或揭示了适用边界；
- 经过多次试错才找到根因或可靠路径；
- 不记录就很可能再次重复调研、做出相反决策或踩同一个坑；
- 结论能给出清晰的触发条件和应用方式。

写入前再确认候选同时满足：未来不同任务大概率会用到、已经稳定或有证据、不能从当前真相源轻易重新发现、维护收益高于索引膨胀成本。任一项不满足就跳过；默认允许本次任务零写入。

不要记录凭据、密钥、令牌、个人身份信息或无关的完整日志。不要为了产生 memory 而硬凑候选。

## 7. 选择唯一真相源

写入前搜索现有 spec、ADR、计划、项目文档、代码注释、测试和 memory：

1. 需求、架构和调研已有正式载体时，更新该唯一真相源；memory 只保存简短结论、触发词和仓库相对链接。
2. 没有正式载体且结论足够稳定时，在全局 memory 写完整的精炼条目（按 6 维度选目录）。
3. 同一事实已存在时更新原条目，不创建近义副本。
4. 细粒度 debug 只在当前任务本来就授权修改代码、且需要解释非显然 invariant 或 "why" 时写代码注释；遵循仓库注释语言，不写排错流水账。
5. 代码、测试、文档或 code graph 已足够发现的事实，跳过或只记录定位索引。
6. 不因结论过时而删除已有 memory；保留历史条目并标记 `superseded`，让后续任务能理解旧结论为何失效。

## 8. 写入 memory

### 触发权重（frontmatter `source` 字段区分）

`frontmatter.metadata.source` 字段区分两类沉淀来源：

| source | 触发方式 | confidence | 落位 |
|---|---|---|---|
| `user-curated` | 用户显式调用 `$my-learn` / `$my-learn setup`，由 agent 协助回忆+沉淀 | 默认 `high` | 6 维度顶层目录 |
| `session-observation` | hook 自动观察 session 提取（ECC v2.1 / Claude Code auto memory） | 0.3-0.9 自评 | 对应维度内 `_auto/` 子目录 |

agent 加载时按 `source` 优先级 `user-curated > session-observation`。这保证人工 gate（my-learn）始终压过自动积累（hook），避免噪声污染主索引。`last_verified` 半年 review 时同标准处理两类条目，但 `session-observation` 类更激进：连续 30 天无命中可触发 TTL 清理。

### 文件命名约定

- **文件名**：英文短 kebab-case（git log / `rg` / shell escape 友好）。中文文件名技术 OK 但降低跨工具一致性。
- **frontmatter `name`**：必须英文 kebab-case，是 agent 工具的索引键（与文件名一致）。
- **frontmatter `title`**：可中文，人类阅读用，agent 显示用。
- **frontmatter `description`**：中文一句话，含触发条件与结论。
- **正文**：中文（selfos 现状），代码、日志、命令保留英文。

### 模板

```markdown
---
name: short-kebab-case-name
title: 中文标题（可选）
description: 中文一句话，含触发条件与结论
metadata:
  type: requirement|decision|research|pitfall|convention
  status: active|needs-review|superseded
  source: user-curated|session-observation
  confidence: high|medium|low|<0.3-0.9>
  scope: global|project
  created: YYYY-MM-DD
  updated: YYYY-MM-DD
  last_verified: YYYY-MM-DD
---

# 标题

## 结论
[未来任务可以直接采用的结论]

## 为什么
[关键理由、边界或非显然根因]

## 如何应用
[触发条件、定位方式、仓库相对路径或正式文档链接]

## 证据与来源
- [原始来源标题](https://example.com) — accessed YYYY-MM-DD；支持的主张
- `relative/path:line`、符号、测试或 commit — 本地验证说明

## 关系
- supersedes / superseded by / related：相对链接；没有则省略
```

写作要求：

- 调研只保存实际读取且确实支持主张的原始 URL；优先官方文档、源码、论文和一手说明。
- 保留访问日期、适用版本和来源之间的分歧；聊天本身不是公开事实来源。
- 用户确认的稳定需求可以写为 `user-confirmed, YYYY-MM-DD`，无需伪造外部引用。
- 使用仓库相对路径；tracked memory 遵循仓库本身的分享边界。
- 全局 memory 的 INDEX.md 每条索引写成 `[标题](相对路径) — 一句话触发条件与结论`，按 6 维度分组。

## 9. 处理矛盾

先尝试用版本、环境、适用范围或明确的 supersede 关系化解：

- 新旧来源适用于不同版本或场景：同时保留并标注范围，不询问。
- 更新的一手证据明确取代旧事实：更新旧条目并建立 supersede 关系，不询问。
- 当前代码、测试或正式文档已明确推翻旧 memory：把旧条目标记为 `superseded`，补充当前真相源的相对定位，并在索引中保留带状态的入口；不要删除旧条目，也不要为可直接发现的新事实另建重复 memory。
- 新结论会改变用户已确认的需求、当前架构方向，或可靠来源互相矛盾且无法判定：暂停写入并询问。

询问时只提供：

1. 旧结论及证据；
2. 新结论及证据；
3. 对当前工作的影响；
4. 推荐处理方式。

不要因措辞差异、补充细节或低影响更新打断用户。

## 10. 收尾

- 明确且无冲突的内容直接写入，不额外请求批准。
- 没有合格候选时不创建文件；除非用户显式调用 `$my-learn`，否则无需报告"无内容"。
- 有写入时在最终回复用一句话说明更新了哪些项目经验（含全局 memory 路径）。
- 查看相关 diff，确认没有覆盖无关改动、没有重复索引、没有泄露敏感信息。
