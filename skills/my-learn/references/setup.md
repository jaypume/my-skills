# 接入项目经验库

仅在用户要求 `$my-learn setup` 或明确接入项目时读取。已有授权覆盖具体变更时直接执行，不重复请求确认。

用户调用 `$my-learn setup` 时执行一次性接入：

1. 定位最近的 Git 根；不在 Git 仓库时使用当前 workspace 根。
2. 完整读取适用的 `AGENTS.md`、`CLAUDE.md`、`.gitignore`。
3. 读取 [`assets/agents-rule.md`](../assets/agents-rule.md)，根据现有协议生成完整变更预览。
4. 核对接入范围：
   - 全局 `~/.agents/memory/` git 仓是否存在；没有则建议 `git init` + remote + GitHub private；
   - 项目 `AGENTS.md`（或 `CLAUDE.md`）是否声明了"全局 memory 在 `~/.agents/memory/`"；
   - 是否需要同步现有的 AGENTS/CLAUDE 兼容关系。
5. 执行用户已确认的具体变更；尚未授权的部分先展示预览并确认。

Setup 必须遵守：

- 已有项目协议优先；不要静默覆盖或迁移既有 memory。
- 已存在正确的 `CLAUDE.md -> AGENTS.md` symlink 时只修改 `AGENTS.md`。
- 两个独立指令文件存在实质冲突时停止，请用户确定唯一真相源。
- 使用 `<!-- my-learn:start -->` / `<!-- my-learn:end -->` 标记规则块；重复运行只更新该块，不追加副本。
- 项目层不创建 `.agents/memory/` 目录或文件，人工知识统一进入全局库。
- 不把机器绝对路径写入可提交文件。
