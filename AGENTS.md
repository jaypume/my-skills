# AGENTS.md

本仓库维护可公开发布的个人 Agent Skills。

- skill 目录使用 `skills/<name>/`，目录名与 `SKILL.md` 的 `name` 保持一致。
- `skills/` 可通过 `~/.agents/skills` 的整目录软链作为本机安装目录；第三方与其他本地技能默认由 `.gitignore` 忽略。新增自研 skill 时，在 `.gitignore` 中添加对应目录的白名单；只修改和提交白名单内的自研内容。
- 第三方技能与 agent 入口由 `skills.yaml` 声明：仓库键使用完整 GitHub URL 并附一句中文简介；agent 使用 `名称: 路径`，需要筛选或禁用时展开为含 `path` 的配置。同步工具集中在 `scripts/skill-sync/`，使用 Node.js 22+ 与 pnpm；首次 `pnpm --dir scripts/skill-sync install --frozen-lockfile`，日常运行该目录的 `plan`、`sync`、`update` 脚本与 `test` 测试。状态、日志和备份位于被忽略的 `.local/skill-sync/`；机器专属 agent 覆盖放在 `~/.config/my-skills/config.toml` 的 `[skill-sync.agents.<name>]` 中。
- `SKILL.md` frontmatter 只保留规范要求的 `name` 和 `description`；description 与正文优先使用中文。
- 不添加 `agents/openai.yaml`，避免维护重复的展示文案。
- 机器相关配置放入用户家目录的共享文件 `~/.config/my-skills/config.toml`；仓库不提交任何本机路径。各 skill 读取对应命名空间（`[my-wiki]` / `[my-commit]` / `[my-learn]`），字段不互通。
- 公开内容不得暴露真实姓名、系统用户名、绝对 Home 路径、私人仓库位置、账号标识、凭据或其他用户隐私。
- 提交前搜索私人路径和敏感信息，确认 diff 仅包含可公开内容。
