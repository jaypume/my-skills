# my-skills

个人维护的自研 Agent Skills 与第三方技能同步清单，遵循 [Agent Skills](https://agentskills.io) 规范。

## 目录

```text
skills.yaml          # 第三方仓库白名单、分类简介与 agent 路径
skills/              # 自研技能源码及被 Git 忽略的第三方安装
scripts/skill-sync/  # 同步脚本、测试、package.json 与 pnpm-lock.yaml
```

每个自研技能位于 `skills/<name>/SKILL.md`，frontmatter 提供唯一的 `name` 和中文
`description`；所需本机配置通过 `config.example.toml` 说明，实际读取下文的共享配置文件。

## 使用

从 GitHub 查看本仓库发布的自研技能：

```bash
npx skills add jaypume/my-skills --list
```

全局安装指定 skill：

```bash
npx skills add jaypume/my-skills --skill my-commit -g
```

安装全部自研技能时使用 `--skill '*'`；指定 agent 并跳过确认可使用：

```bash
npx skills add jaypume/my-skills --skill my-commit -g -a codex -y
```

个人环境中的第三方白名单与 agent 软链接通过下文的「同步技能」命令维护。

## 本机配置

需要本机配置的自研技能从 `~/.config/my-skills/config.toml` 读取各自命名空间。

首次使用时，参考 `skills/<skill-name>/config.example.toml` 创建该文件，
并把示例中需要的本机路径填入对应 skill 的表。例如：

```toml
[my-wiki]
wiki_root = "~/wiki"
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

新增自研 skill 时，同时在 `.gitignore` 中为 `skills/<skill-name>/` 添加白名单。

本机开发的新技能可先用 `git add -N skills/<skill-name>/SKILL.md` 登记入口，
让同步工具识别；此操作不暂存文件内容，正式提交仍按独立请求执行。

本机可将 `~/.agents/skills` 整目录软链到此仓库的 `skills/`，让开发源码与启用入口一致。
第三方技能通过 `skills.yaml` 声明，由同步脚本调用 skills CLI 安装；它们和其他未列入
Git 白名单的本地技能默认被忽略。第三方来源记录继续由 skills CLI 管理；自研技能
通过 Git 更新，不通过 skills CLI 覆盖安装。

本地 `npx skills add . --list` 会发现安装目录中的第三方技能；远程仓库只包含已提交的
自研技能。需要检查发布范围时，以 `git ls-files skills` 和提交 diff 为准。

删除自研技能的 `SKILL.md` 后，下一次同步会解除其已管理入口，无需先暂存或提交；
同步不会删除该目录中的其他文件。

提交和推送使用普通 Git 流程：

```bash
git add skills/<skill-name>
git commit -m "feat: add <skill-name> skill"
git push
```

## 同步技能

编辑 [`skills.yaml`](skills.yaml) 的第三方白名单与 agent 入口。需要 Node.js 22+、pnpm 和 Git；
安装、卸载由 `npx skills` 执行，工具与依赖集中在 `scripts/skill-sync/`。在仓库根目录运行：

```bash
pnpm --dir scripts/skill-sync install --frozen-lockfile  # 首次安装依赖
pnpm --dir scripts/skill-sync run plan    # 只读预览
pnpm --dir scripts/skill-sync run sync    # 同步白名单与软链接
pnpm --dir scripts/skill-sync run update  # 按清单来源更新第三方技能
pnpm --dir scripts/skill-sync test        # 运行测试
```

`skills.yaml` 用 `agents` 配置入口路径，用 `repositories` 声明完整 GitHub URL 与技能名。
仓库按通用用途到专用用途分组，分类和中文简介直接维护在清单中。例如（条目节选）：

```yaml
agents:
  claude-code: ~/.claude/skills
  codex: ~/.codex/skills

repositories:
  https://github.com/anthropics/skills:
    - frontend-design
```

新增 agent 按 `名称: 路径` 添加，默认同步全部白名单技能与 Git 跟踪的自研技能。
需要筛选技能或禁用链接时，将对应 agent 展开：

```yaml
agents:
  oh-my-pi:
    path: ~/.omp/agent/skills
    skills: [my-commit, frontend-design]
```

展开配置必填 `path`，默认 `enabled: true`、`skills: ["*"]`；设为 `enabled: false`、使用
空技能列表或移出配置，会移除该 agent 对应的已管理链接。
同名技能只能声明一次；`agents`、`repositories` 两个根字段必须保留，清空时写 `{}`。
机器专属覆盖放在 `~/.config/my-skills/config.toml` 的 `[skill-sync.agents.<agent>]`，字段同上。
这些选项只控制链接维护；Codex 等工具对 `~/.agents/skills` 的直接发现不受影响。

共享入口 `~/.agents/skills` 应指向本仓库的 `skills/`。只卸载此前接管、后来移出白名单的
第三方技能；自研技能、`UNMANAGED` 安装、agent 自有目录与外部链接均保留。
状态、日志及更新/卸载备份保存在 `.local/skill-sync/`；包操作失败时恢复该批包，已成功的操作
保留，修复后可重跑。备份需手动清理；运行期间避免用 Skills Deck 或 CLI 并发修改技能。

macOS 已验证；Windows 尚需实机验证，创建软链接通常需要开发者模式或管理员终端。

## 文档技能选用

技术文档统一使用 `technical-writing`；设计提案、RFC 和方案重构叠加
`writing-design-docs`，交付前由 `reviewing-technical-prose` 审校。
这三个第三方技能通过 `skills.yaml` 纳管，按文档任务加载；技能分工由各 Agent
的全局指令统一维护。图表约定见 [my-diagrams](skills/my-diagrams/SKILL.md)，
Mermaid 编写和渲染按需补充第三方技能。

用户要求、项目权威格式及共享 Agent 指令中的本地约定，优先于第三方技能的
通用风格。第三方正文保持上游原样，更新仍通过同步工具完成。

## 界面技能选用

个人技术栈、设计系统、窗口记忆和宿主验收约定见 [my-app-ui](skills/my-app-ui/SKILL.md)。
第三方候选及用途见 `skills.yaml` 的 UI 和 SwiftUI 分类，按本次界面改动选择。

Impeccable 首次使用会下载配套引擎；UI UX Pro Max 搜索需要 Python 3，结果须核对产品
与技术栈。界面交付仍需检查实际渲染与 Tauri 宿主体验。

## 参考

- [skills.sh 文档](https://www.skills.sh/docs)
- [skills CLI](https://github.com/vercel-labs/skills)
- [Agent Skills 规范](https://agentskills.io)
