# my-skills

个人维护的 Agent Skills 集合，遵循 [Agent Skills](https://agentskills.io)
规范，并使用 skills.sh 支持的 `skills/<name>/SKILL.md` 仓库布局。

## 目录

```text
skills/
├── commit/
│   ├── SKILL.md
│   └── agents/openai.yaml
└── my-distill/
    ├── SKILL.md
    └── agents/openai.yaml
```

每个 skill 至少包含一个 `SKILL.md`，其 YAML frontmatter 必须提供唯一的
`name` 和清晰的 `description`。`agents/openai.yaml` 是可选的 OpenAI UI 元数据。

## 使用

先查看仓库内可用的 skills：

```bash
npx skills add jaypume/my-skills --list
```

全局安装指定 skill：

```bash
npx skills add jaypume/my-skills --skill commit -g
```

全局安装全部 skills：

```bash
npx skills add jaypume/my-skills --skill '*' -g
```

也可以指定 agent，并用 `-y` 跳过交互确认：

```bash
npx skills add jaypume/my-skills --skill commit -g -a codex -y
```

私有仓库或需要 SSH 身份验证时，直接使用 Git URL：

```bash
npx skills add git@github.com:jaypume/my-skills.git --list
```

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
