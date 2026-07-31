# my-skills

个人维护的 Agent Skills 集合，遵循 [Agent Skills](https://agentskills.io)
规范，并使用 skills.sh 支持的 `skills/<name>/SKILL.md` 仓库布局。

## 目录

```text
skills/
├── my-commit/
│   └── SKILL.md
└── my-wiki/
    ├── SKILL.md
    └── config.example.toml
```

每个 skill 至少包含一个 `SKILL.md`，其 YAML frontmatter 必须提供唯一的
`name` 和清晰的中文 `description`。机器相关配置集中在用户家目录的共享
文件 `~/.config/my-skills/config.toml`，各 skill 按命名空间读取；
`config.example.toml` 仅作为字段示例参考，不会被读取。

## 使用

先查看仓库内可用的 skills：

```bash
npx skills add jaypume/my-skills --list
```

全局安装指定 skill：

```bash
npx skills add jaypume/my-skills --skill my-commit -g
```

全局安装全部 skills：

```bash
npx skills add jaypume/my-skills --skill '*' -g
```

也可以指定 agent，并用 `-y` 跳过交互确认：

```bash
npx skills add jaypume/my-skills --skill my-commit -g -a codex -y
```

私有仓库或需要 SSH 身份验证时，直接使用 Git URL：

```bash
npx skills add git@github.com:jaypume/my-skills.git --list
```


## 配置

本机配置集中在 `~/.config/my-skills/config.toml`，被所有 my-* skill 共享读取。
各 skill 只关心自己命名空间下的字段，避免互相污染。

首次使用时，参考 `skills/<skill-name>/config.example.toml` 创建该文件，
并把示例中需要的本机路径填入对应 skill 的表。例如：

```toml
[my-wiki]
wiki_root = "~/code/notes/selfos/wiki"
```

该文件不应提交到任何仓库；路径不存在或字段缺失时，相应 skill 应当停止
写入并提示用户完成配置，而不是擅自猜测或回退到默认值。

## 开发

克隆仓库后，在 `skills/<skill-name>/` 下新增或修改 skill：

```bash
git clone git@github.com:jaypume/my-skills.git
cd my-skills
npx skills add . --list
```

提交和推送使用普通 Git 流程：

```bash
git add skills/<skill-name>
git commit -m "feat: add <skill-name> skill"
git push
```


## 参考

- [skills.sh 文档](https://www.skills.sh/docs)
- [skills CLI](https://github.com/vercel-labs/skills)
- [Agent Skills 规范](https://agentskills.io)
