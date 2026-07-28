---
name: my-distill
description: Distill durable research findings, option comparisons, architecture trade-offs, reusable methods, and open questions from the latest substantive turns of the current conversation into the user's public Wiki. Use when the user invokes my-distill, asks to 蒸馏/沉淀/保存刚才或最近几轮对话, or wants recurring AI coding and LLM agent practices organized into a maintained topic rather than left in chat.
---

# My Distill

把对话当作候选线索，不当作事实来源。默认从最近 3 个实质讨论轮次提炼少量、可复用、可追溯的知识，并按 Wiki 的现行协议完成一次闭环写入。

## 1. 确定输入

1. 只使用触发时**当前对话已经可见的上下文**，不要查找或读取外部会话文件。
2. 默认回溯触发语之前最近 3 个**实质讨论轮次**。一个轮次包含一条实质用户消息，以及下一条实质用户消息前的 assistant 调研、分析和结论。
3. 排除本次纯触发指令、系统/开发者指令、环境信息、插件清单、工具调用噪音和状态播报。
4. 若触发消息除 `$my-distill` 外还包含新的实质信息，把该信息纳入候选；若只是触发语则不计入 3 轮。
5. 当前可见上下文少于 3 轮时使用全部，不要为了凑满轮次去扫描本地会话文件。

## 2. 筛选候选

只保留满足至少两个条件的内容：

- 来自调研、公开资料、对比实验或明确的方案推理；
- 换一个项目或工具仍可复用；
- 3–12 个月后仍可能影响判断；
- 能解释机制、边界、权衡或失败条件；
- 能形成选型维度、架构模式、实践原则或值得追踪的问题。

优先提炼：

- 多方案对比后的稳定判断及适用边界；
- AI coding、LLM agent、上下文、工具调度、并发、后台任务、评测等可迁移实践；
- “为什么这样选”而不只是“如何敲命令”；
- 有证据支撑且会反复用到的数字、限制和反例；
- 尚不能下结论，但值得继续调查的问题。

丢弃：

- 当前仓库的改动清单、命令、报错、临时路径和完成状态；
- 只对某个客户、内部项目、私有架构或特定版本补丁有意义的细节；
- 密钥、账号、定价、联系人、私人评价及其他不可公开信息；
- 无来源的顺口判断、重复常识、很快过期的瞬时信息；
- 为了显得有产出而硬凑的条目。

没有合格内容时直接报告“最近对话无可沉淀内容”，不要写 Wiki。

## 3. 建立证据

1. 当前聊天只能帮助定位线索，**不得**写入 Wiki 的 `sources`，也不得作为公开证据。
2. 提取对话中实际引用的原始 URL；优先核对官方文档、源码仓库、论文或一手说明。
3. 只把已经读取且确实支持主张的公开来源写入 `sources`。不要把搜索结果页或二手转述冒充一手证据。
4. 无公开来源但确有长期价值时，可写成 `needs-review`、`confidence: low` 的待验证判断，或放入 question 页；不要伪造引用。
5. 项目专属架构知识应留在对应代码仓。只能把脱敏、跨项目通用的模式写入公开 Wiki。
6. 联网核验时，搜索词不得包含客户名、私人路径、内部代码或其他私密上下文。

## 4. 定位并读取 Wiki

默认 Wiki 根目录为 `/Users/pj/code/notes/selfos/wiki`；用户明确指定时使用其路径。

写入前必须：

1. 完整读取 Wiki 根目录 `AGENTS.md`，以实时协议为准。
2. 读取 `wiki/index.md`、`wiki/log.md` 最近记录和相关页面。
3. 用 `rg` 搜索标题、aliases、关键术语和已有专题，先合并后新建。
4. 检查 Wiki 仓库的 `git status`，保留用户已有改动，不覆盖无关内容。

若 Wiki 不存在、不可写，或其协议与本技能冲突，停止写入并说明阻塞点。

## 5. 选择知识形态

按以下顺序落位：

1. 更新已有 concept、insight 或 topic。
2. 新建可复用概念或跨来源洞察。
3. 只有一份公开来源本身值得长期检索时，才建 source-summary。
4. 只有内容形成完整跨来源调研或决策稿时，才写 `outputs/research/`。
5. 证据缺口或冲突无法解决时，更新或创建 question。

对于 AI coding / LLM agent 技巧：

- 优先创建或维护 `wiki/topics/AI coding best practices.md` 作为主题地图；
- 把稳定知识分别链接到既有的 Agent 横评、具体工具、上下文管理、工具调度、评测等页面；
- 主题页负责导航、原则与知识缺口，不复制各子页全文；
- 同类内容已存在时扩展原页，不因一次新对话创建日期型碎片页。

## 6. 完成写入事务

严格遵循 Wiki `AGENTS.md` 的 frontmatter、命名、证据和链接规则，并一次完成：

1. 更新或创建相关知识页；
2. 添加必要的双向链接；
3. 同步 `wiki/index.md` 的摘要、状态和来源数；
4. 向 `wiki/log.md` 追加 `distill` 记录，Source 只列公开来源或写“本次对话引用的公开来源见相关页面”；
5. 检查日期、`sources`、`source_count`、confidence、重复页和明显断链；
6. 查看 Wiki 仓库 diff，确认只包含本次范围。

除非用户明确要求，不复制聊天全文到 `raw/`、不创建提交、不向外部服务发送私人内容。

## 7. 汇报

简洁说明：

- 新增或更新了哪些页面；
- 提炼出的 1–5 条核心知识；
- 丢弃了哪些类型的临时或私密信息；
- 哪些判断仍待验证。

若只完成分析而没有合格候选，明确说明未修改 Wiki。
