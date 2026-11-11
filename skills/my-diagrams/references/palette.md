# 工业实验室与硬件工程色板

适合浅色工程图的候选色板如下，按内容与展示场景决定是否采用；可以只选其中少量颜色，也可以另选色板。表中的角色映射仅供需要用颜色区分类别时参考，普通节点可统一使用中性色，重点再局部强调。

填充色用于节点主体，边框色辅助区分，文字色用于保证可读性。项目已有品牌色时可替换 `brand`；同一图组内保持已采用的颜色含义一致，避免品牌色兼任容易混淆的状态语义。

| 语义 | 填充色 | 边框色 | 文字色 | 使用建议 |
|---|---|---|---|---|
| 输入与信息 `input` | `#E6EEF0` | `#476F8D` | `#263746` | 外部需求、资料、事件入口 |
| 定义与外部适配 `definition` / `connector` | `#EEE9DF` | `#7C6653` | `#3E332A` | 规范、配置、协议、适配器 |
| 品牌或成功 `brand` / `success` | `#DDEFE6` | `#55B685` | `#214C38` | 优先选择一种主语义；品牌色仅用于核心系统或控制面 |
| 执行与运行环境 `platform` / `execution` | `#E8ECEF` | `#5E6D78` | `#2F3B43` | 机器、基础设施、执行节点 |
| 人工参与 `human` | `#F3E1D3` | `#B65D3A` | `#512B20` | 配合人物图标、泳道或明确任务标签 |
| 警告与待决策 `warning` / `decision` | `#F3E8C8` | `#A27125` | `#5A411A` | 等待、选择、需注意的非阻塞状态 |
| 风险与阻塞 `risk` | `#F2D9D2` | `#A94435` | `#541F1A` | 错误、危险、失败、阻塞 |
| 收益与输出 `benefit` / `output` | `#E0EFF2` | `#377C88` | `#214A52` | 结果、证据、交付物，与输入蓝拉开差异 |
| 状态与内容存储 `store` | `#E7E4DD` | `#777168` | `#36312B` | 数据库、快照、持久状态 |
| 补充说明 `note` | `#F7EA48` | `#8A7414` | `#3D3500` | 确需引起注意的补充说明可用亮黄色便签；普通说明沿用中性色 |

以下 `classDef` 是样式参考库，只选取本图实际需要的条目；节点角色的存在不自动要求使用对应颜色。边框粗细与虚线按本图层级和语义调整：

```mermaid
classDef input fill:#E6EEF0,stroke:#476F8D,color:#263746
classDef definition fill:#EEE9DF,stroke:#7C6653,color:#3E332A
classDef connector fill:#EEE9DF,stroke:#7C6653,color:#3E332A
classDef brand fill:#DDEFE6,stroke:#55B685,color:#214C38,stroke-width:2px
classDef success fill:#DDEFE6,stroke:#55B685,color:#214C38,stroke-width:2px
classDef platform fill:#E8ECEF,stroke:#5E6D78,color:#2F3B43,stroke-width:2px
classDef execution fill:#E8ECEF,stroke:#5E6D78,color:#2F3B43
classDef human fill:#F3E1D3,stroke:#B65D3A,color:#512B20,stroke-width:2px
classDef warning fill:#F3E8C8,stroke:#A27125,color:#5A411A
classDef decision fill:#F3E8C8,stroke:#A27125,color:#5A411A
classDef risk fill:#F2D9D2,stroke:#A94435,color:#541F1A
classDef benefit fill:#E0EFF2,stroke:#377C88,color:#214A52,stroke-width:2px,stroke-dasharray:6 4
classDef output fill:#E0EFF2,stroke:#377C88,color:#214A52
classDef store fill:#E7E4DD,stroke:#777168,color:#36312B
classDef note fill:#F7EA48,stroke:#8A7414,color:#3D3500,stroke-width:2px,stroke-dasharray:6 4
```
