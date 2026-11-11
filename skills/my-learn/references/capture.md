# 保存项目经验

仅在用户明确要求保存、总结经验或调用 `$my-learn` 时读取。先筛选稳定、非显然、可跨任务复用且有证据的内容；没有合格候选时允许零写入。

写入遵循当前运行时的 memory 权限和更新入口。运行时若要求提交更新说明，只写规定入口，并说明原条目尚未更新；不要同时改原库或手工编辑工具生成的 memory。

## 知识落点

公共知识写到全局对应子目录，项目专有写项目 `AGENTS.md` / 既有真相源：

```
1. 个人偏好？         → personal/
2. 工作方法/流程？    → methodology/
3. 通用工程 gotcha？  → common/
4. 特定工具/库的坑？   → external/
5. 跨项目领域知识？    → domains/<field>/
6. 项目专有偏好/约定？ → 项目 AGENTS.md（或项目既有真相源）
```

前 5 个是跨项目维度；项目专有内容不再新增到全局 `projects/`，更新项目 `AGENTS.md` / 既有真相源。

判断更细的 `metadata.type` 字段保留原 5 档（`requirement | decision | research | pitfall | convention`），与维度正交。

## 筛选候选

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

## 选择唯一真相源

写入前搜索现有 spec、ADR、计划、项目文档、代码注释、测试和 memory：

1. 需求、架构和调研已有正式载体时，更新该唯一真相源；memory 只保存简短结论、触发词和仓库相对链接。项目 `AGENTS.md` 只放稳定约束和入口，详细决策、调研与故障经验写入项目既有文档。
2. 没有正式载体且结论足够稳定时，按判断口诀落位：公共知识在全局 memory 写精炼条目，项目专有写项目 `AGENTS.md` / 既有真相源。
3. 同一事实已存在时更新原条目，不创建近义副本。
4. 细粒度 debug 只在当前任务本来就授权修改代码、且需要解释非显然 invariant 或 "why" 时写代码注释；遵循仓库注释语言，不写排错流水账。
5. 代码、测试、文档或 code graph 已足够发现的事实，跳过或只记录定位索引。
6. 不因结论过时而删除已有 memory；保留历史条目并标记 `superseded`，让后续任务能理解旧结论为何失效。

## 条目格式

### 触发权重（frontmatter `source` 字段区分）

`frontmatter.metadata.source` 字段区分两类沉淀来源：

| source | 触发方式 | confidence | 落位 |
|---|---|---|---|
| `user-curated` | 用户显式调用 `$my-learn` / `$my-learn setup`，由 agent 协助回忆+沉淀 | 默认 `high` | 全局对应维度顶层目录 |
| `session-observation` | hook 自动观察 session 提取（ECC v2.1 / Claude Code auto memory） | 0.3-0.9 自评 | 对应维度内 `_auto/` 子目录 |

agent 加载时按 `source` 优先级 `user-curated > session-observation`。这保证人工 gate（my-learn）始终压过自动积累（hook），避免噪声污染主索引。`last_verified` 半年 review 时同标准处理两类条目，但 `session-observation` 类更激进：连续半年（约 180 天）无命中可触发 TTL 清理。

### 文件命名约定

- **文件名**：英文短 kebab-case（git log / `rg` / shell escape 友好）。中文文件名技术 OK 但降低跨工具一致性。
- **frontmatter `name`**：沿用既有条目命名，可用中文；新条目可使用与文件名一致的英文 kebab-case。
- **frontmatter `title`**：可中文，人类阅读用，agent 显示用。
- **frontmatter `description`**：中文一句话，含触发条件与结论。
- **正文**：优先中文，代码、日志、命令保留英文。

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
- 全局 memory 的 INDEX.md 每条索引写成 `[标题](相对路径) — 一句话触发条件与结论`，按维度分组；项目专有内容只索引到项目 `AGENTS.md` / 真相源。

## 处理矛盾

先尝试用版本、环境、适用范围或明确的 supersede 关系化解：

- 新旧来源适用于不同版本或场景：同时保留并标注范围，不询问。
- 更新的一手证据明确取代旧事实：更新旧条目并建立 supersede 关系，不询问。
- 当前代码、测试或正式文档已明确推翻旧 memory：把旧条目标记为 `superseded`，补充当前真相源的相对定位，并在索引中保留带状态的入口；保留旧条目，也不要为可直接发现的新事实另建重复 memory。
- 新结论会改变用户已确认的需求、当前架构方向，或可靠来源互相矛盾且无法判定：暂停写入并询问。

询问时只提供：

1. 旧结论及证据；
2. 新结论及证据；
3. 对当前工作的影响；
4. 推荐处理方式。

不要因措辞差异、补充细节或低影响更新打断用户。

## 收尾

- 明确且无冲突的内容直接写入，不额外请求批准。
- 没有合格候选时不创建文件；除非用户显式调用 `$my-learn`，否则无需报告"无内容"。
- 有写入时在最终回复用一句话说明更新了哪些项目经验（含全局 memory 路径）。
- 查看相关 diff，确认没有覆盖无关改动、没有重复索引、没有泄露敏感信息。
