---
name: my-squash
description: 在保留关键大颗粒提交、他人归属、merge 拓扑和原始 commit 时间戳的前提下，整理尚未集成的本地 Git 历史，将同一工作中的零碎、文档、状态更新和反复修复提交选择性 squash。用户调用 $my-squash，或明确要求清理、合并零碎提交但不希望完全重建历史时使用；默认以 upstream/main 为基线，重写后的 author/committer 时间必须逐字取自原历史，严禁编造。完全按最终文件重新分组历史时改用 my-curate-git-history，仅分析或整理已集成历史时不使用。
---

# 选择性合并零碎提交

清理一段连续、尚未集成的本地历史，只 squash 能明确归入同一工作的碎片，保留有独立审阅价值的里程碑提交。目标是让历史更易读、易审阅和易定位，而不是追求尽可能少的提交。

## 授权与范围

- 用户明确调用本 skill 或要求 squash / 清理零碎历史，即授权重写已确认范围内的本地提交；若只要求分析、建议或给出候选列表，保持只读。
- 默认目标为当前分支、端点为操作前的 `HEAD`、基线为本地 `upstream/main`。用户指定基线时以其为准。默认基线不存在且用户未指定时必须询问，不得擅自换成 `origin/main`、共同祖先或猜测的 hash。
- 只处理 `base..HEAD` 中尚未集成的提交。不 fetch、pull、push、创建 PR、更新远端或自动执行 `--force-with-lease`。
- 不改写 submodule 内部历史或工作区；父仓库 gitlink 仅在原范围本来就包含其变化时保留原样。
- “保留提交”默认指保留其职责、内容、作者归属和历史位置，不等于保证 object ID 不变。首个改写点之后的提交会因祖先变化而更换 hash；若用户要求保留特定 hash、签名或已发布提交，先把它作为不可跨越的范围边界，无法同时满足时说明冲突并询问。

## 动手前检查

一次性确认：

- 仓库根、当前分支、旧 `HEAD`、基线解析结果、`git status --short --branch`，以及基线是否为旧 `HEAD` 的祖先。
- `base..HEAD` 的提交拓扑、first-parent 顺序、merge、作者/邮箱、author/committer 时间、subject、trailers、签名、tag、每个提交的 `name-status`、stat 和实际 diff。
- 哪些提交已被其他本地分支、远端跟踪分支或 tag 包含；范围是否涉及已发布、多作者或受保护历史。
- submodule/gitlink 与仓库指令要求的检查。

通过 `git config user.name`、`git config user.email`、`.mailmap` 和用户明确提供的身份识别本人提交；名字或邮箱存在歧义时询问，不能仅凭显示名猜测。其他作者的提交默认受保护。

工作树或 index 有既存改动时停止。基线不是旧 `HEAD` 的祖先、范围已集成、重写会破坏签名或无法可靠保留 merge 拓扑时，也先说明影响并取得确认。

开始前保存旧 `HEAD` 与 tree hash，并创建唯一、易识别的本地恢复 branch 或 tag，例如 `backup/<branch>-before-squash-<timestamp>`。同时记录操作前 status、分支包含关系、merge 列表和 submodule 状态。恢复引用创建成功前不得 rebase。

## 时间戳硬约束

历史整理不是生成一条发生在当前时刻的新时间线。开始 rebase 前，为每个计划保留或生成的新提交记录明确的旧提交来源，以及该来源的完整 `author date` 和 `committer date`。

- 保持 `pick` 的提交使用它自身原来的 author/committer 时间；被 squash/fixup 的组合提交使用目标保留提交原来的两项时间；重建的 merge 使用原 merge commit 的两项时间。
- 若职责重排导致上述映射不适用，只能从原始目标范围中另选一个真实提交，并提前记录 old→new 时间来源；不得凭内容完成时间、文件修改时间或当前执行时间推算。
- author date 与 committer date 必须分别逐字复用，包括日期、时分秒和时区偏移。原本两者不同就继续保持不同，不得把 author date 复制给 committer date。
- 禁止使用当前时间、整点、取整、平均值、按顺序手工加减秒或其他合成时间。`--committer-date-is-author-date` 也不能替代真实 committer date。
- Git rebase 默认会把 committer date 改为执行时刻，不能依赖默认行为。创建或 amend 每个新提交时显式设置其映射来源的 `GIT_AUTHOR_DATE` 与 `GIT_COMMITTER_DATE`；若当前执行方式不能可靠保留，应停止并更换可验证的方法，而不是接受新时间。

## 判断哪些提交保留

先完成逐提交分类和合并计划，再启动 rebase。文件数与时间间隔只是信号，真实 diff、职责和依赖关系优先。

默认保留下列提交：

- merge commit，以及其承载的真实分支拓扑；不把 merge 扁平化为普通提交。
- 其他作者的提交。不要把本人的碎片跨过他人提交移动或合入其中，也不要把多作者提交压成单一作者；确需跨越时先取得确认并保留适当的 co-author trailers。
- 完成一个独立功能、修复、迁移、协议/API、schema 或可回滚配置闭环的提交。
- 修改约 10 个或更多文件，或具有明显大颗粒度的提交。该阈值是强保留信号而非机械规则：批量格式化、生成物、重命名和 vendored 文件需按实际语义判断；少于 10 个文件的完整里程碑同样应保留。
- release、tag、签名、安全修复、数据迁移或对 bisect 有独立价值的节点。

不要仅为了减少数量而合并两个本来清晰、可独立审阅或可独立回滚的提交。

## 判断哪些提交 squash

优先标记这些本人提交为候选：

- 与相邻实现属于同一职责的 1–2 行补漏、拼写、lint、格式化、测试快照或生成物更新。
- 只勾选 task、同步完成状态或更新 spec 进度的微小提交；通常合入对应真实实现，或紧随其后的同一功能收尾提交。
- 同一主题的纯文档提交。优先合入它所说明的实现；没有对应实现时，可将时间接近且主题一致的文档整理为一个文档提交，不把无关文档机械混成一批。
- 连续针对同一个 bug 的尝试、回退、再修复和测试补齐；以最终正确修复为边界，合成一个如实描述最终结果的提交。
- 明显属于前一提交的 review fix、遗漏文件、测试补充、manifest/lockfile 联动或 CI 修复。
- 本地 WIP/checkpoint，以及同一未发布尝试中最终完全抵消的引入与回退；只有确认没有应保留的决策、迁移或审计价值时才折叠或丢弃。

时间接近能说明它们可能属于同一工作会话，尤其是几分钟或同一天内连续产生的提交；时间间隔本身不能覆盖主题、依赖、作者和审阅边界。较长间隔、不同 issue/spec、不同发布阶段通常是保留边界。

允许将非相邻的本人碎片移动到其真实归属提交旁再 squash，但必须同时满足：

- 位于同一 first-parent 线性片段内，不跨 merge、他人提交、发布节点或其他受保护提交。
- 调整后不改变最终 patch、依赖顺序和有意义的中间状态。
- 预期冲突小且能从原始 diff 快速、确定地解决；一旦需要猜测业务意图，立即 abort 并保留原顺序。

为每个候选记录“目标提交、依据、是否重排、归属 message”。无法清楚回答一个碎片应归入哪里时就保留它，不为凑数量强行 squash。

## 执行 rebase

- 无 merge 的线性范围使用交互式 rebase；范围含 merge 时使用能够保留拓扑的 `--rebase-merges`，并逐项审核 todo 中的 `label`、`reset` 和 `merge`，不得删除或 squash merge 行。
- 用 `fixup` 合并不需要保留 message 的补漏；用 `squash` 合并包含仍需吸收信息的提交，并将最终 message 改写为准确描述合并后 diff 的仓库规范格式。
- 只改动计划中已列出的 todo 行。关键大提交保持 `pick`；非目标作者、merge 和受保护节点不得成为 fixup/squash 目标。
- Git 默认可能保留 author 信息，但会把 committer date 改为执行时刻。必须按“时间戳硬约束”的 old→new 映射显式恢复两项原始时间；不得伪造作者、日期、签名或 trailers。
- 冲突仅在归属明确、能由原提交与最终 tree 直接证明时解决。每次解决后检查完整 diff；不确定时立即 `git rebase --abort`，保留恢复引用并报告阻塞点。
- hook 若生成、改写或额外暂存文件，停止并核对，不把意外内容带入后续提交。

## 验证与交付

完成后至少验证：

- 新 `HEAD` tree hash 与恢复引用中的旧 `HEAD` tree hash 完全相同；这是最终内容未变的硬门槛。
- 工作树和 index 干净，submodule 工作区状态与最终 gitlink 均未发生计划外变化。
- 对照操作前记录核查 merge 数量、subject、父子关系和 first-parent 顺序；受保护的职责边界仍存在。
- 逐个检查新提交的 message、作者、trailers、时间、签名状态、`name-status`、stat 和实际 diff。验证每个新提交的 author/committer 时间与映射旧提交逐字一致，任何当前时间或原范围中不存在的时间都视为失败。对他人或关键提交建立 old→new hash 映射，并说明因祖先变化导致的 hash/签名变化。
- 检查每组被 squash 的原提交都只进入预定目标，最终没有遗留 `fixup!`、`squash!`、临时 message 或空提交。
- 运行 `git diff --check`、仓库强制检查和与最终内容直接相关的低成本验证。只有实际执行过才能声称通过。

任何 tree equality、merge 拓扑或归属验证失败时停止，不 push，不删除恢复引用，也不增加补丁提交掩盖差异。优先从恢复引用重新设计 todo。

最终报告基线、旧/新提交数、保留与合并摘要、新提交 hash/subject、每个新提交的原始时间来源、关键 old→new 映射、merge 与 tree 验证、实际检查、恢复引用和工作区状态。明确说明尚未 push；不要主动删除恢复引用。
