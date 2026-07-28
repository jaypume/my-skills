---
name: my-commit
description: 快速检查、暂存并提交当前 Git 仓库的改动。用户调用 $my-commit，或明确要求提交、创建 commit、整理并提交当前修改时使用；默认走低轮次快路径并忽略 submodule/gitlink 变化，仅在混合改动、敏感文件或暂存边界不清时升级检查。
---

# 高效提交

快速完成范围清晰的 Git 提交，同时守住不丢改动、不泄密、不混入无关内容的底线。

## 决策原则

- 用户明确要求提交即表示授权完成本地 commit；范围可从上下文和 diff 判断时直接执行，不再确认。
- 默认把同一目的的代码、配置和必要配套改动合成一个 commit；只有实质独立时才拆分。
- 先走快路径。只有发现明确风险信号才增加检查，不为理论风险预先执行全套审计。
- 复用本轮已有的 status、diff 和测试结果；工作树未变化时不要重复运行等价检查。
- 默认排除 submodule 工作树和 gitlink 变化；用户只说“提交全部”或调用 `$my-commit` 不构成更新 gitlink 的授权。

## 快路径

适用于范围清楚、改动单一、没有异常文件或 staged 冲突的日常提交。

1. **一次盘点**：在一个工具调用中获取仓库根、`git status --short --branch`、必要的 diff 和最近提交格式。小改动直接读实际 diff；大改动先看 stat/name-status，再按需展开。
2. **直接定批次**：根据用户请求和 diff 选定路径并生成 commit message，不输出计划，不请求确认。
3. **暂存并提交**：优先显式路径；确认整个工作树属于同一任务且不含 submodule 时可用 `git add -A`。仓库含 submodule 时默认只暂存普通文件。已完整审阅同一批路径且没有既有 staged 冲突时，可在一次工具调用中顺序执行暂存、`git diff --cached --check`、commit。
4. **一次闭环**：提交后同时读取新 commit 的 hash/subject 和 `git status --short --branch`，报告提交内容及剩余改动。

快路径中不重复查看 staged 全量 diff：若暂存路径与刚审阅的路径完全一致，`--cached --check` 足够；使用 `git add -A`、存在既有 staged 内容或暂存结果可能变化时，再审阅 staged diff。

## Submodule 边界

- 默认忽略子仓库内部 dirty 状态、HEAD 变化和父仓库 gitlink 更新，不主动暂存 submodule 路径。
- 只有用户明确要求“更新/添加某个 submodule”或“提交 gitlink”时，才把对应 gitlink 纳入本次提交。
- 用户明确授权后，先确认子仓库目标 commit 已存在远端，再更新父仓库 gitlink；避免父仓库引用其他机器无法取得的提交。
- 若 gitlink 已被 staged，但用户未明确授权，不提交该 gitlink，也不擅自改写用户的 index；停止该批次并说明边界。

## 升级检查

只在出现以下信号时转为审慎路径：

- staged 与 unstaged 同时存在且归属不清，或已有 staged 内容可能属于其他任务。
- 改动跨多个目的，包含重命名、删除、冲突或大量生成文件。
- 出现 `.env`、凭据、密钥、认证配置、数据库、日志、缓存、二进制或异常大文件。
- 用户指定的提交范围与实际 diff 不一致，或仓库边界不明确。

审慎路径仍要收敛：

- 只扫描候选文件和新增行，不对整个仓库做泛化敏感词扫描。
- 只展开影响判断的 diff；不要同时重复输出 full diff、stat、summary 和 numstat。
- 保留用户已有暂存边界；无法安全处理时才暂停说明。

## 验证和提交信息

- commit 任务不默认运行测试、构建或全仓 lint。只执行仓库指令明确要求的检查，或与本次改动直接相关且快速的验证；复用已通过的结果。
- 始终运行 `git diff --cached --check`。提交钩子失败时报告真实错误，不为通过检查顺手改代码。
- 从实际改动推断简洁 message；遵循仓库现有格式和 commitlint，如 `type(scope): subject`。
- 不为单纯提交新增测试、文档或提交记录。

## 安全边界

- 不使用 `git reset --hard`、`git checkout --`、`git clean` 或其他可能丢失改动的命令。
- 不修改、还原或删除与提交任务无关的用户改动。
- 不 amend、rebase、push 或创建 PR，除非用户明确要求。
- 用户明确指定提交范围、拆分方式或提交信息时，以用户要求为准。
