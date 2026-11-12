# 结构化编辑器

运行 `cake-presentation edit`，打开 `http://127.0.0.1:4174`。`--config` 与 `--port` 可改变配置位置和端口；仅绑定本机。既有 `build` / `dev` 工程无需接入编辑器，也不必改成 JSON。

界面从左到右为页面列表、内容与布局、预览。编辑区采用较大的输入文字和控件，并获得更多宽度；预览放在右侧，仍可使用缩放菜单查看细节。

## 内容与配置

编辑器适用于由 JSON 内容驱动的演示。每个内容文件是页面数组，每页有唯一 `id`（字母、数字、下划线或连字符）、`type`、`title`。应用继续负责渲染这些对象；未知内容字段会保留。它不解析和回写任意 TSX，也不是自由画布。

```json
{
  "entry": "src/main.tsx",
  "outfile": "report.html",
  "title": "项目汇报",
  "assets": "src/content/assets.json",
  "editor": {
    "files": ["src/content/business.json", "src/content/learning.json"],
    "schema": "presentation.editor.json",
    "assetsDirectory": "src/assets/uploaded"
  }
}
```

`editor.files` 按应用中的章节顺序列出 JSON 文件，必须与应用实际导入顺序一致。`editor.schema` 描述表单字段。`assets`、`assetsDirectory` 可省略；上传图片需要同时配置两者。文件路径相对于配置文件，编辑文件必须位于工程内，不能通过链接越界。修改 Toolkit 源码或路径配置后重新构建 Toolkit 并重启编辑服务。

字段 schema 示例：

```json
{
  "version": 1,
  "sectionField": "section",
  "fields": [{ "key": "title", "label": "标题", "type": "textarea", "required": true }],
  "types": {
    "talk": {
      "label": "讲解要点",
      "fields": [
        { "key": "items", "label": "要点", "type": "list" },
        { "key": "notes", "label": "讲解备注", "type": "textarea" }
      ]
    },
    "visual": {
      "label": "配图讲解",
      "fields": [
        { "key": "points", "label": "内容", "type": "table", "columns": ["标题", "说明"] },
        { "key": "image", "label": "配图", "type": "image", "required": true },
        { "key": "imageFocus", "label": "放大图片区", "type": "boolean" }
      ]
    }
  }
}
```

`fields` 是所有页面共用的字段，随后呈现 `types[page.type].fields`。支持 `text`、`textarea`、`boolean`、`select`、`list`、`table`、`image`。`required` 默认 false，`help` 为帮助文字；`select` 的 `options` 为 `{value,label}` 数组，`list` 提供 options 时逐项使用下拉框。`table.columns` 规定固定列数。图片 options 可为已有图片键提供易读名称；未列出的上传图片使用自动名称。属性路径目前仅支持顶层键，不支持任意嵌套对象。

布局控制仍由应用实现：schema 将应用支持的布局属性映射成 select / boolean；编辑器不会为已有模板自动发明布局参数。`EditorField` 与 `EditorSchema` 可从工具包入口作为 TypeScript 类型导入。

## 可选树形编排

在 schema 中设置 `"parentField": "parentId"`，页面仍保存在原 JSON 数组内，子页通过 `parentId` 指向另一页面的 id，根页省略该字段。父节点可以位于另一个已配置文件；同级顺序取文件与数组顺序。重复 ID、无效父节点及循环关系会被拒绝。

列表按前序遍历显示层级编号与缩进，总页数只统计根节点，另列内容节点总数；搜索保留命中项的祖先。内容区展示可点击的父节点路径。启用后树结构只读，隐藏拖动、移动、复制与删除，父节点字段不能同时配置为普通表单字段；文字、布局、图片、撤销与草稿合并照常使用。播放方式与导航由消费应用根据父节点引用实现，编辑器不替应用渲染树。

## 图片与预览

图片清单是键到路径的映射，路径相对于清单文件：

```json
{ "screenshot": "../assets/screenshot.png" }
```

应用通过 `import assets from 'cake-presentation:assets'` 读取图片 URL。Toolkit 在构建时将对应本地文件内嵌；不需要维护额外的 TS import。TypeScript 工程添加声明：

```ts
declare module 'cake-presentation:assets' {
  const assets: Record<string, string>
  export default assets
}
```

新图片支持 PNG、JPEG、WebP、GIF、AVIF，每张不超过 9 MB，单次草稿请求不超过 32 MB。上传后以新文件名进入草稿，不覆盖已有素材；点击保存才写入图片目录和清单。现有本地 SVG 可以通过清单引用，上传入口不接受 SVG。

草稿使用应用的同一个打包入口渲染，350 ms 防抖后更新 iframe，不是另一套近似排版。应用若将页面 id 放在 URL hash 中，列表选择会定位对应页面；其他导航模型需由应用自行支持。每次更新重新挂载应用，弹窗等临时状态会重置。预览加载不会抢走编辑区的焦点，连续输入、光标和选区得以保留；主动进入预览后仍可交互。该保护仅注入编辑器预览，独立打开和导出的演示不受影响。

编辑器每 3 秒检查内容、已构建源码、Sass 依赖和媒体变化。对照草稿起点、浏览器修改和最新源码，自动合并不同字段的更改；同一字段有不同修改时保留两版，点击“合并外部修改”逐项选择。网络请求期间输入的新内容不会被稍后返回的数据覆盖。编译失败时保留上次预览，显示错误。

## 保存、撤销与恢复

- 未启用 parentField 时，拖动页面可在同一文件内排序，也能移到其他文件；上移/下移和文件下拉框提供键盘替代。配置 `sectionField` 后，跨文件移动会采用目标文件已有第一页面的章节值；空文件没有可推断值，保留原值。
- 未启用 parentField 时，复制页面产生新的 id；删除可撤销。初版通过复制已有模板建立新页面，不会把一种模板自动转换为另一种。
- 撤销/重做最多保留 40 步；连续输入会合并。支持 Ctrl / ⌘ + Z、Shift + Ctrl / ⌘ + Z、Ctrl / ⌘ + S。
- 每次编辑先写入浏览器 localStorage，并在停止输入约 800 ms 后备份到 `.cake-presentation/drafts/<工程标识>/`。这是可恢复草稿，不是已保存的内容源；只有“保存”或“导出 HTML”才回写内容与图片。浏览器空间不足或服务离线时会提示，仍可下载草稿。工程标识按配置路径区分，避免同名工程共用草稿。
- 草稿携带编辑开始时的源内容。刷新时可恢复并合并最新源码；冲突逐项展示“编辑器草稿 / 当前源文件”，选择后仍需保存。老版没有基线的草稿也能恢复，但来源版本变化后，每项差异都要求选择。尚未处理的旧草稿不会被新输入或同步操作覆盖；“保留草稿，使用源文件”会先备份草稿。
- “工程草稿”可载入本工程其他会话的草稿，载入时同样合并。列表和表格没有行 ID，因此按整个字段处理冲突，避免将排序变化误判为单元格修改；不同字段自动合并，删除与另一方修改同页时需要选择。页面顺序冲突也需要选择，两边新增的页面都保留。章节文件配置变化不自动合并，需要下载后按新结构整理。
- 外部修改合并后清空旧撤销历史，防止撤销旧快照时把新内容改回去；保留焦点、选区与列表滚动位置。“同步源文件”执行合并，不直接丢弃草稿。保存后已纳入源文件的草稿从待恢复列表隐藏，但备份记录仍在工程中。
- 保存先校验内容和构建，再核对源文件版本；旧文件写入 `.cake-presentation/backups/<时间与编号>/`，提交的新稿记入 `saved-draft.json`，随后逐文件原子替换，成功后写入 `save-result.json`。多文件操作中途失败时尝试恢复已写文件；进程或机器中断后的恢复需使用备份。外部修改和第二个编辑窗口的旧版本保存会被拒绝，编辑器需合并后重新保存。
- “导出 HTML”先保存再按 Toolkit 构建，输出配置中的文件。它不执行消费工程自定义的附加脚本或类型检查；需要额外检查时继续运行消费工程自己的构建命令。导出的文件没有编辑器和本机服务依赖。

已验证 Chrome 桌面流程与 390px 布局。编辑以桌面为主；窄屏将页面列表、表单和预览纵向排列。这不是多人协作服务器；不支持 PPTX 导入、任意元素拖拽或自动版式修复。

焦点回归验证：在 CakeUI 仓库安装开发依赖后运行 `node presentation-toolkit/tests/editor-focus.browser.mjs`（需可用 Chrome；可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定路径）。覆盖标题、列表、表格、选区、连续输入、切换输入框、源码刷新、预览交互和离线导出隔离。

手工编辑兼容性验证：`node presentation-toolkit/tests/editor-merge.browser.mjs` 覆盖保存、工程草稿、不同字段合并、冲突选择、刷新恢复、旧版草稿、焦点与请求竞态。`npm test` 另覆盖页面移动、删除、排序、图片与保存版本保护。
