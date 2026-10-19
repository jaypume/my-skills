---
name: my-goal-prompt
description: 根据当前仓库的一个或多个 OpenSpec change 生成可独立执行的详细 Goal Prompt。用户调用 $my-goal-prompt，或要求为 OpenSpec change 准备实施提示词、交接任务或长期执行说明时使用；每个 change 单独生成一份，默认包含实时仓库漂移处理、分阶段大颗粒 commit、分层验证和 YYYY-MM-DD-xx-report.md 最终报告。只生成 Prompt，不实施 change 或提交代码，除非用户另行明确要求。
---

# 生成 OpenSpec 实施 Goal Prompt

把当前 OpenSpec change 转换为可交给另一个 Agent 持续执行的自包含 Prompt。Prompt 必须基于实时 artifacts 和源码边界，而不是复述通用开发流程。

## 选择 Change

按以下顺序确定范围：

1. 用户明确指定的 change。
2. 当前对话、打开文件或最近工作明确指向的 change。
3. 仍无法缩小时，运行 `openspec list --json`，选择当前请求涉及的 active changes。

选中多个 change 时，为每个 change 生成独立文件；不要合并成一份联合 Prompt。识别 change 间依赖和建议执行顺序，并把依赖门禁写入各自 Prompt。没有可用 OpenSpec change 时停止说明，不凭空编造 artifacts。

默认输出到仓库根目录：

```text
.local/TODO/<change-name>-goal-prompt.md
```

用户指定目录或命名时以用户要求为准。已有同名文件时先阅读：同一 change 的更新请求可以聚焦修订；无法确认归属时使用清晰后缀，不覆盖用户内容。

## 读取实时真相源

生成前必须：

1. 找到仓库根，读取根目录及相关子目录的 `AGENTS.md`。
2. 对每个 change 运行 `openspec status --change <name> --json`，使用返回的 concrete artifact paths。
3. 完整读取已有 proposal、design、delta specs、tasks 和 `.openspec.yaml`；读取其修改的 main specs 与明确依赖的其他 changes。
4. 检查当前 branch、HEAD、status、最近提交和 submodule 状态，区分用户既有改动。
5. 定向查看 change 涉及的实时源码、测试、验证说明和产品能力矩阵。仓库有 `.codegraph/` 时按项目规则优先使用 CodeGraph。
6. 运行 `openspec validate <name> --strict`；只把它作为 artifact 结构证据。

不要把 Prompt 生成时的 hash、任务完成度、文件路径或命令结果写成未来执行时仍成立的事实。可以写入定位方式和相对路径；必须要求执行 Agent 重新解析实时基线。

## 每份 Prompt 的必要内容

### 目标与权威边界

- 写明仓库、change 名称、目标产品行为和适用入口。
- 提醒执行 Agent 创建并持续执行 Goal；用户未指定 token 预算时不要自行设置。
- 最新用户指令、实时 `AGENTS.md`、实时 OpenSpec 和当前代码依次作为约束，不让旧 Prompt 覆盖新事实。
- 明确 non-goals、兼容/迁移边界、Serve/Edge/UI/submodule 等实际范围；不主动扩张到 change 未要求的产品面。

### 实时仓库漂移

Prompt 必须假定执行期间代码和 OpenSpec 会出现新提交或并发修改，并要求执行 Agent：

- 开始、每个阶段、每次 commit 和最终验证前记录并比较 HEAD/status；
- HEAD 变化时审阅新增 commits 与相关 diff，重读被修改的指令、artifacts、schema 和源码；
- 将新提交作为实时基线，调整未提交实现并重跑受影响验证；
- 不覆盖或回滚并发提交，不自行 pull/rebase/reset/amend/改写历史；
- 保护已有 staged/unstaged、untracked 和 submodule 改动；同文件无法安全合并时才报告 blocker；
- 不把远端可能变化当成自动联网、拉取或发布授权。

### Change 专属实施阶段

从 proposal 的目标、design 的决策、delta specs 的 scenarios 和 tasks 的依赖顺序提炼实施阶段。每个阶段应形成可验证的垂直切片，通常依次覆盖：

- 依赖与基线校正；
- Protocol/contract 与先失败的 conformance tests；
- Store/schema/migration；
- Harness/Runtime 核心行为；
- 实际 Transport/产品入口；
- 取消、失败、恢复、安全和资源边界；
- 文档、迁移账本与完成状态收口。

不要机械复制 tasks，也不要固定所有 change 使用同一阶段。Prompt 要写出本 change 的关键类型、状态转换、数据一致性边界、负向场景和真实消费者。

### 大颗粒阶段性 Commit

要求执行 Agent 在完成可独立验收的大块实现后创建阶段性 commit，并给出 3–6 个基于实际垂直切片的建议边界。数量是建议，不为凑数拆提交。

每个 commit 应同时包含对应实现、测试、OpenSpec task 状态和必要文档。Prompt 必须要求：

- 只显式暂存本阶段路径，不默认使用 `git add -A` 或 `git add .`；
- 提交前检查 `git status --short`、staged stat、staged diff 和 `git diff --cached --check`；
- 不混入用户改动、其他 change、凭据、日志、数据库、缓存、构建产物或最终 `.local` 报告；
- 主仓和 submodule commit 分开；未获授权不提交 submodule 或更新 gitlink；
- 不 push、rebase、amend、reset、archive change 或改写历史，除非用户另行授权。

Prompt 中授权的是未来执行阶段按要求创建本地 commits；生成 Prompt 本身不得提交当前仓库。

### 验证与证据

从实时 `AGENTS.md`、tasks 和测试说明选择命令，至少覆盖仓库强制的 format/lint/test 与 `openspec validate --strict`，并增加 change 专属的：

- deterministic unit/contract/conformance；
- Store migration、rollback、restart/recovery；
- 真实 socket/process/Transport；
- Provider、Native UI、设备、bundle 或外部组件 gate（仅在 change 要求时）。

明确证据边界：类型存在、编译通过、strict validation、mock、截图或进程启动不能替代 change 要求的真实行为。无法运行的 gate 必须记录为 not-run/blocked，不得声称通过。

### 最终 Report

每份 Prompt 都要求执行完成后按执行当天的本地日期创建：

```text
.local/YYYY-MM-DD-<change-slug>-report.md
```

若同名文件属于其他执行，使用保持 `YYYY-MM-DD-xx-report.md` 形式的递增后缀，不覆盖。报告默认不提交，除非用户明确要求。

报告至少包含：

- 起始/最终 branch 与 HEAD，执行期间新增 commits 及适配；
- 权威 change、最终行为和架构边界；
- 阶段性 commits 及各自验收范围；
- 数据/schema/migration 与兼容结果；
- 全部验证命令及 pass/fail/not-run/blocked；
- 真实功能证据和证据层级；
- 用户/并发改动、submodule/gitlink 和最终 status；
- 剩余风险、恢复步骤和下一步。

即使最终被真实 blocker 阻断，也生成同路径 blocked report，但不得把 Goal 标记 complete。

### 完成条件

Prompt 结尾必须给出可判定条件：

- 最新 tasks 全部有实现和证据后才勾选；
- 目标行为和关键失败/恢复场景真实工作；
- 适用入口一致，未混入 non-goals；
- 分层验证与 strict validation 满足；
- 大颗粒 commits 已创建且边界干净；
- 最终 report 已生成；
- 工作区剩余改动归属清楚。

## 输出检查

写入前确认每份 Prompt：

- 可独立复制执行，不依赖本次对话的隐藏上下文；
- change 名称、依赖、路径和命令来自当前仓库；
- 已要求未来执行时重新检查实时 HEAD，而非固定当前快照；
- 阶段、commit、验证、report 和 blocker 规则完整；
- 没有凭据、私人路径或不必要的本机信息；
- 没有实施代码、执行 commit、push 或修改 OpenSpec artifacts。

使用 `apply_patch` 创建 Prompt 文件，检查 Markdown 结构、尾随空白和最终路径。最后列出生成文件、change 对应关系、建议执行顺序和未解决依赖。
