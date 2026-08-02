<!-- my-learn:start -->
## 项目经验召回与积累

只有预计会复用或产生跨任务稳定知识时，才使用已安装的 `my-learn` skill，例如长期需求、已收敛决策、有证据的调研结论、用户对未来行为的纠正，以及经过反复试错确认的非显然根因。一次性或本机配置、机械性维护、简单查询、照单执行、原因明显的临时故障和容易从当前真相源重新发现的事实默认跳过，不读取或写入 memory；拿不准时也跳过。

### Memory 位置

**全局唯一真相源**：`~/.agents/memory/`（独立 git 仓，push 到 GitHub private）。**项目层** `<repo>/.agents/memory/INDEX.md` 仅是代理入口。详细约定见 [[~/.agents/memory/personal/memory-location-convention]]。

### 6 维度分类（写入前先问）

```
1. 个人偏好？         → personal/
2. 工作方法/流程？    → methodology/
3. 通用工程 gotcha？  → common/
4. 特定工具/库的坑？   → external/
5. 跨项目领域知识？    → domains/<field>/
6. 只此一项目用？      → projects/<github-id>/<repo>/
```

### 触发权重（frontmatter `source` 字段）

- `user-curated`（my-learn 显式触发） → 默认 `confidence: high`，落 6 维度顶层
- `session-observation`（hook 自动积累） → `confidence: 0.3-0.9`，落对应维度内 `_auto/`
- agent 加载优先级 `user-curated > session-observation`

### 操作要点

1. 主线工作前先读项目层 `.agents/memory/INDEX.md`，按约定跳到全局 `~/.agents/memory/INDEX.md`，只按任务关键词、错误、组件和文件打开相关条目；目录不存在时正常继续。
2. 优先复核当前代码、测试、正式文档和一手来源，不把 memory 当作已确认的实时事实。
3. 正常完成任务，不为了记忆频繁询问或打断用户。
4. 结束前把稳定需求、已确认决策、带原始来源的调研结论、用户纠错和非显然根因按 6 维度写到全局对应目录；memory 一条事实一个文件并更新 `~/.agents/memory/INDEX.md`。
5. 已有 spec、ADR 或项目文档时以其为准，memory 只留结论与链接；debug 细节能从代码、测试、注释或 code graph 找到时不重复保存。
6. 明确内容直接写入；仅在新旧需求、架构决策或可靠调研证据发生无法化解的实质冲突时询问用户。

### 命名约定

- 文件名英文 kebab-case（git/CLI 友好）；frontmatter `name` 必须英文 kebab-case；`title` / `description` / 正文可用中文。
- 索引文件用 `INDEX.md`，不用 `MEMORY.md`（避免被 Claude Code / pi 默认识别并接管）。

遵循当前仓库的分享边界和 memory 格式；不记录凭据、机器绝对路径或无关完整日志。
<!-- my-learn:end -->
