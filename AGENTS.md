# AGENTS.md

本仓库维护可公开发布的个人 Agent Skills。

## 目录与工具

- `skills/` 是技能内容目录，`~/.agents/skills` 整目录软链到此处；chezmoi 管理共享目录入口，本仓库的同步脚本维护各 agent 的技能链接。
- 自研技能按 `skills/<name>/` 存放，并在 `.gitignore` 中逐目录加入 Git 白名单；第三方技能内容与其他本地安装默认忽略，安装来源和选择范围由 `skills.yaml` 维护。
- 同步工具使用 Node.js 22+ 与 pnpm，脚本、测试、`package.json`、锁文件和依赖集中在 `scripts/skill-sync/`，根目录保留清单和说明文档。
- 优先复用 `npx skills` 的来源解析、下载、安装与卸载能力；本地脚本负责清单差异、链接适配、覆盖保护和失败恢复，减少重复维护。

## 清单格式与组织

- `repositories` 使用完整 GitHub 仓库 URL 作为键，下面显式列出技能名；每个仓库附一句简短中文简介，说明用途或作用，同名技能只声明一次。
- 按用途用注释分组，每个类别配一个不同的 emoji；通用能力在前，平台专用能力在后，开发流程、浏览器等基础能力放在 UI/UX 和 SwiftUI 之前。分类保持为注释，沿用平铺的仓库映射。
- `agents` 默认使用 `名称: 路径`，新增 agent 直接添加同格式条目；路径以配置为准。需要筛选或禁用时展开为含 `path` 的配置，通过 `skills`、`enabled` 控制链接维护；默认包含清单技能与 Git 跟踪的自研技能。
- 配置字段和用法以实际脚本及 `skills.yaml` 为准。README 保持简明，目录、示例和命令随实现同步；仓库分类、来源与简介集中维护在清单中。

## 同步与纳管

首次安装依赖：`pnpm --dir scripts/skill-sync install --frozen-lockfile`。以下命令在仓库根目录执行：

```bash
pnpm --dir scripts/skill-sync run plan    # 只读预览
pnpm --dir scripts/skill-sync run sync    # 同步清单与链接
pnpm --dir scripts/skill-sync run update  # 明确更新上游内容时使用
pnpm --dir scripts/skill-sync test        # 验证同步脚本行为
```

- 先预览再同步；`sync` 用于对齐清单，`update` 用于更新第三方内容，自研技能通过 Git 更新。链接开关只影响入口维护，Codex 等工具仍可直接发现共享目录。
- 纳管已有技能前，核实上游仓库、技能名称、实际文件和来源记录；通过官方 CLI 登记来源并验证结果。未要求更新时保留原内容和本地依赖；按指定上游覆盖时先备份，再核对安装结果。
- 安装与更新使用 `--full-depth` 查找嵌套技能，并用 `--skill` 精确选择；以实际生成的 `SKILL.md`、技能名称和来源记录判断成功，不能仅依据 CLI 退出码。
- 仅卸载此前接管、后来移出清单的第三方技能；保留自研技能、`UNMANAGED` 安装、agent 自有目录和外部链接覆盖。来源不明的条目先调查再纳管。
- 状态、CLI 日志和更新/卸载备份放在被忽略的 `.local/skill-sync/`；保留失败恢复与备份机制，备份由用户按需清理。运行期间避免与 Skills Deck 或独立 CLI 并发修改同一批技能。
- 纯分类、注释或排序修改核对解析结果不变；配置内容修改后检查同步计划与结果；脚本行为修改运行相关测试。同步后确认计划收敛，并核对实际文件、来源和软链接目标；跨平台结论以目标机器验证为准。

## 自研技能与选用偏好

- 目录名与 `SKILL.md` 的 `name` 一致，frontmatter 只保留 `name`、`description`；description、正文和注释优先使用中文，表达简明、具体。
- 不添加 `agents/openai.yaml`，避免维护重复的展示文案。
- 界面技能主要服务 Tauri 的共享 Web 前端与 Rust 业务逻辑。视觉方向从 `frontend-design`、`impeccable` 中选一项主导，其他设计技能按需补充；平台指南约束体验，SwiftUI 技能用于实际的 SwiftUI 代码。

## 本机配置与公开边界

- 机器专属配置集中在 `~/.config/my-skills/config.toml`；各技能读取各自命名空间，agent 覆盖使用 `[skill-sync.agents.<name>]`。公开示例使用通用路径或占位符。
- 仓库不提交真实姓名、系统用户名、绝对 Home 路径、私人仓库位置、账号标识、凭据或其他隐私；提交前检查候选 diff 中的私人路径与敏感信息。
- commit、push 按各自明确请求执行；提交时仅暂存已审阅的目标文件，保留无关改动与暂存边界。
