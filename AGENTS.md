# AGENTS.md

本仓库维护可公开发布的个人 Agent Skills。

- skill 目录使用 `skills/<name>/`，目录名与 `SKILL.md` 的 `name` 保持一致。
- `SKILL.md` frontmatter 只保留规范要求的 `name` 和 `description`；description 与正文优先使用中文。
- 不添加 `agents/openai.yaml`，避免维护重复的展示文案。
- 机器相关配置放入用户家目录的共享文件 `~/.config/my-skills/config.toml`；仓库不提交任何本机路径。各 skill 读取对应命名空间（`[my-wiki]` / `[my-commit]` / `[my-learn]`），字段不互通。
- 公开内容不得暴露真实姓名、系统用户名、绝对 Home 路径、私人仓库位置、账号标识、凭据或其他用户隐私。
- 提交前搜索私人路径和敏感信息，确认 diff 仅包含可公开内容。
