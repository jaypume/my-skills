# Mermaid 源码与验收

- 每张图只维护一个可编辑源码：内嵌 Mermaid 或独立 `.mmd` 二选一；渲染图用于临时验收，只有交付需要静态图片时才保留派生文件。
- 复杂架构图、数据流图和多子图布局优先使用 ELK 引擎：图首声明 `config: layout: elk`；不支持的渲染器会回退默认布局，不产生错误。除非用户明确授权，通常不要使用Dagre layout。
- 数据流图通常按源 → 处理 → 传输 → 消费分层，按版面选择自上而下或从左到右；被多处访问的存储/快照节点就近独立分组，明确写入与读取方向，避免长边跨图绕行。
- 所有节点与边的 label 用双引号包裹（菱形节点内的括号必须引号）；sequenceDiagram 文本避免 `;`、`+`、`>` 等易被解析为语句边界的字符。
- 优先使用可移植的纯色 `themeVariables` / `classDef`。只声明本图实际使用的样式；先统一普通节点样式，再为必要的重点或状态定义少量 class，按阅读需要决定是否给角色单独配色。
- 交付前用 `npx -y @mermaid-js/mermaid-cli` 本地渲染，除确认无 parse error 外，还需检查实际尺寸下的布局、文字、连线与视觉焦点，再写回。渲染成功不等于视觉验收通过。

需要统一 Mermaid 基础主题时，可从以下浅色工程图模板开始，并按背景、品牌与展示媒介调整：

```yaml
---
config:
  layout: elk
  themeVariables:
    primaryTextColor: "#263746"
    lineColor: "#777168"
    edgeLabelBackground: "#FFFFFF"
---
```

`primaryTextColor` 应与画布和节点填充保持足够对比；`lineColor` 通常使用清晰但克制的中性色，关键路径或异常连线再局部强调；`edgeLabelBackground` 贴近所在区域底色并保持不透明，避免连线穿过文字。节点填充与强调色按本图需要另行选择。
