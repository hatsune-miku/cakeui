# 设计记录

## 0.3.0：对齐 AnyDrop

粉色主题和 compact 密度以 AnyDrop 为最终样式来源，校准浅深配色、控件尺寸、字体、卡片边线、日志与提示层；修复半透明进度轨道重复绘制，以及带外边距的触发元素导致提示偏移的问题。已有粉色 / compact 消费者升级后会采用这些新默认值；blue / gold 保留各自配色，默认入口和 HTML 原生属性接口不变。已知粉色对比度边界见本文末尾。

## 参考来源

AnyDrop 是组件样式的最终蓝本。参考之间出现冲突，尤其是配色冲突时，直接修正 CakeUI 与 AnyDrop 保持一致。粉色主题和紧凑密度用于还原 AnyDrop；业务逻辑和运行时依赖由各项目分别维护。

| 来源                  | 查阅位置                                                                                              | 保留的设计特征                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| AnyDrop               | `apps/desktop-tauri/src/styles.scss` 的 button、field-hint、field-tooltip、card、log-entry 与输入样式 | 轻背景、内描边、快速按压反馈、低干扰问号帮助、独立浮层   |
| KFC Client            | `src/ui/styles/_tokens.scss`、`_buttons.scss`、`App.scss` 与相关布局                                  | 蓝 / 金配色与舒适密度参考；粉色与紧凑密度以 AnyDrop 为准 |
| KVM                   | `panel/src/components/ui/Select`、`Field`、`Badge`                                                    | 原生选择、清楚的表单标签、紧凑低饱和状态标签             |
| WalAssistantLark      | `src/components/LogsView`                                                                             | 时间与正文分栏、较密日志行、相邻时间可以省略、追加跟随   |
| CakeDesign revision 6 | [SKILL.md](https://raw.githubusercontent.com/hatsune-miku/cakedesign-skill/refs/heads/main/SKILL.md)  | 按下反馈、减少交互步骤、状态提示                         |

参考项目的组件名称与实现位置可能不同，例如 KVM 使用 Select / Badge，AnyDrop 的组件样式在统一文件内。CakeUI 使用 ComboBox、Tag、HoverTips、TextBox、CheckBox 等名称。

## API 决策

- 原生表单属性是主接口，不重新发明 `onValueChange` 代替输入控件的 onChange。只有 Tabs 的组合状态使用 onValueChange。
- ComboBox 使用可定制的原生 select，与 ContextMenu 共用菜单表面样式，保留 option / optgroup、表单和键盘行为；不支持 `appearance: base-select` 的浏览器使用原生选择器。
- ComboBox 的可选 searchable 模式在库内提供查询输入和 Popover 列表，继续用内部 select 承载值、事件、ref 和表单语义。查询只是候选过滤，不变成自由文本值；取消查询不修改选择。多选和 size 列表保留原生路径，不引入网络、虚拟列表或额外运行时依赖。
- 表格、列表、菜单和日志接受 JSX children，调用者保有数据结构、排序、筛选和渲染权。
- 单个组件各有目录和 SCSS；仅跨组件共享类型、小型 className 工具、颜色与输入 mixin。
- Provider 只是 CSS 作用域，支持嵌套；所有浮层都保留在所属 DOM 树的浏览器顶层，没有 body portal 的主题复制问题。
- Dialog 使用原生模态行为；Tooltip 和 ContextMenu 使用原生 Popover。支持 SSR 首屏输出，交互在客户端 effect 中绑定。
- ContextMenu 的 `interactive` 模式用手动 Popover 保留右键按下到松开的整个手势；在松开坐标进行实际命中检测，只有可用菜单项才执行。独立的按压状态让触发区域下陷，并处理 Escape、窗口失焦和丢失松开事件后的恢复。
- ContextMenu 普通模式也使用手动 Popover 和同一套外部点击关闭机制，避免 Linux 在 contextmenu 触发后的同次右键松开立即关闭菜单；普通模式仍由 contextmenu 打开，不参与 Interactive 的按压和松开选择。
- 运行时仅有 React / React DOM peer dependencies；构建和测试工具全部位于 devDependencies。

## 从参考中作出的调整

- 默认按钮常态保持中性，按下时按 AnyDrop 的方式染上主题色并轻微下移；输入框聚焦仅保留一圈内描边。
- 页面默认不可选择文字，输入框、日志及示例代码区允许选择和复制。
- 状态标签使用与填充匹配的 `accent-ink`，保留参考配色的色调，同时改善小字号文字对比度。
- 日志跟随尊重用户当前阅读位置，不在每次追加时强行拉回底部。
- 禁用、键盘导航、Escape、焦点恢复、表单验证、受控与非受控行为在初版中直接实现。
- 不携带参考应用的远程字体文件或图标资源。默认字体从已安装字体中选择；应用可覆写字体变量。
- 不引入复杂全局服务。Toast 的队列和日志窗口化等策略由调用方决定。

## 验证方式

单元测试覆盖原生表单与 refs、混合复选框、标签页键盘与受控状态、分页边界、通知暂停、日志滚动及服务端渲染。浏览器测试覆盖真实焦点约束、菜单与提示、主题持久化、任务组合流程、390px 布局及减少动态效果；axe 检查工作台和六种主题预览。

浏览器实际行为验证使用 Chrome。其他现代浏览器以原生标准能力为兼容基础，初版未逐一完成 Firefox / Safari 的实机验证。可访问性自动检查不代替完整的辅助技术人工测试。

`npm run test:package` 实际打包并离线安装到 `.cache` 下的隔离消费目录，检查包的全部导出、严格声明解析、CSS 导出、服务端渲染及 Vite 消费构建；不通过源码别名替代安装验证。

## AnyDrop 配色的已知对比度边界

粉色主题按维护者要求保持 AnyDrop 原色。白字 / #d15776 主按钮的对比度约 3.93:1；浅色 #8a807a 辅助文字 / #f4f1ee 背景约 3.42:1，低于小字号 WCAG AA 的 4.5:1。浏览器测试继续执行完整 axe 审计，明确记录六主题预览中这三个已知节点（两套粉色主按钮和浅色辅助色值），新增节点或其他规则违规仍失败；不能将此表述为粉色主题通过完整 WCAG AA。AnyDrop 的颜色优先要求不等于无障碍豁免，若后续增加高对比度模式应单独设计，不能悄悄改变默认外观。

浏览器测试可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定本机 Chromium；未设置时使用 Playwright 默认浏览器。

## HTML 幻灯片子入口

`@a1knla/cakeui/presentation` 面向 Web / React DOM，用 JSX 组合内容；不实现 RN 或编辑器。基础组件入口与 CSS 保持独立，构建输出两个 ESM / 类型入口和两份 CSS，没有新运行时依赖。

版式采用同一组对齐线：页边距、标题、内容、页脚。1280px 宽画布以 60px 页边距、24px 间距组织内容；封面 / 普通标题 / 正文 / 注释为 72 / 48 / 24 / 16px。Segoe UI 系统字体用于正文，Cascadia Code / Consolas 用于代码，不加载远程字体。封面使用大标题与浅主题底；分栏页通过留白组织内容；指标使用强调线；图片与图注保持在同一个 figure 内，短引文使用竖线和大字，避免每页都堆叠卡片。

默认蓝色使用纸张 #fdfefe、文字 #29313a、辅助 #596572、强调 #3d658f、浅强调 #d6e7f7、中性底 #eef2f6。粉 / 金沿用 CakeUI 色相与明暗切换；幻灯片粉色强调为 #b93d5c、辅助 #72605b，专门照顾大屏和注释对比度，不修改基础组件的 AnyDrop 配色。`--cake-presentation-*` 变量作用在 Deck；紧凑 UI 密度不影响幻灯片排版。

固定画布用 CSS aspect-ratio 和 cqw 缩放内容，避免 JS 测量引起重排和 SSR 差异。逐页演示保留页面挂载，非活动页面 inert 且隐藏；连续阅读允许内容增长，窄屏取消画布比例并改成单栏。没有自动播放；快捷键只响应获得焦点的 Deck，编辑和原生交互内容保留各自行为。全屏由用户点击触发，拒绝时提供错误反馈。

打印规则只处理组件本身，不在库样式内写全局 @page。独立 `/slides.html` 示例负责 A4 横向、隐藏自己的工具栏和导出全部页面；应用需要按自己的纸张、内容长度和宿主页结构处理打印。完整 API、限制与可编译示例维护在 `docs/ai.md`。
