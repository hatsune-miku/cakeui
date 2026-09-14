# CakeUI

熟悉的零件，刚好的体验。为需要长期使用的软件准备的 React UI 库。

TypeScript + SCSS，48 个可组合组件，粉 / 蓝 / 金三套配色及明暗模式。运行时只有 React 与 React DOM 两个 peer dependencies，不依赖 Tailwind、CSS-in-JS、图标库或第三方 UI 库。

当前为 **0.1.0 初版**，npm 包名为 **[@a1knla/cakeui](https://www.npmjs.com/package/@a1knla/cakeui)**。

后续版本发布流程见 [npm 发布说明](docs/publishing.md)。

在线工作台：[gallery.vanillacake.cn](https://gallery.vanillacake.cn)。更新部署与证书续期见 [部署说明](docs/deployment.md)。

详细技术参考：[Gallery 阅读页](https://gallery.vanillacake.cn/?page=docs) · [AI 完整纯文本](https://gallery.vanillacake.cn/llms-full.txt) · [llms.txt 索引](https://gallery.vanillacake.cn/llms.txt)。覆盖全部组件的 API、默认值、交互边界、原生属性与 ref、完整类型、主题变量和可验证示例。正文源文件为 [docs/ai.md](docs/ai.md)，后续修改按 [AGENTS.md](AGENTS.md) 评估并同步文档。

## 本地开发

需要 Node.js 22.12+（开发环境）和 npm。

```sh
npm install
npm run dev
```

打开终端输出的地址，默认是 `http://127.0.0.1:5173`。工作台包含组件搜索、可复制的 JSX 示例、三套主题、密度切换、任务列表示例和设计变量。默认配色为蓝，任务数据仅保存在内存，手动主题选择保存在本机 localStorage。旧版未区分手动与默认配色，本次更新统一迁移为蓝，并保留明暗模式；此后手动选择继续保存。

```sh
npm run typecheck    # 严格 TypeScript 检查
npm run docs:build   # 从正文、公开类型和主题源码生成纯文本
npm run docs:check   # 检查文档生成物及公开组件覆盖
npm test            # 原生属性、表单、键盘、受控状态、计时与滚动测试
npm run test:browser # Chrome 真实交互、移动布局、axe 可访问性检查
npm run test:package # 打包、离线安装到临时消费项目并验证类型 / SSR / 构建
npm run build       # dist/index.js、声明文件、cakeui.css
npm run build:demo  # 独立的 demo-dist 静态工作台
npm run format      # 按项目约定格式化
npm run check       # 类型、单元测试、两种构建、格式检查
```

Windows 浏览器测试默认使用已安装的 Google Chrome；其他系统使用 Playwright Chromium，先运行 `npx playwright install chromium`。配置位于 `playwright.config.ts`。浏览器测试独立于 `check`，需要可运行的浏览器环境。

## 集成

在已有的 React 19 项目中安装：

```sh
npm install @a1knla/cakeui
```

需要测试本地改动时，也可以在 CakeUI 目录运行 `npm pack`，然后安装生成的 `a1knla-cakeui-0.1.0.tgz`：

```sh
npm install /path/to/a1knla-cakeui-0.1.0.tgz
```

```tsx
import { Button, CakeProvider, Field, TextBox } from '@a1knla/cakeui'
import '@a1knla/cakeui/style.css'

export function Settings() {
  return (
    <CakeProvider theme="blue" mode="system">
      <form onSubmit={save}>
        <Field htmlFor="name" label="名称">
          <TextBox id="name" name="name" defaultValue="工作空间" required />
        </Field>
        <Button type="submit" variant="primary">
          保存
        </Button>
      </form>
    </CakeProvider>
  )
}

function save(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const values = new FormData(event.currentTarget)
  console.log(values.get('name'))
}
```

需要 **React 19+**，支持原生 `<dialog>`、Popover API、`:has()` 和 `color-mix()` 的现代浏览器。构建产物是 ESM，React 保持 external；CSS 需要显式引入一次。JavaScript 可以 tree-shake，CSS 初版按一份完整样式提供。

`CakeProvider` 是可选的局部 CSS 容器，不挂载全局服务、不修改 document、不要求应用接入状态管理。缺省 CSS 变量为蓝色浅色；Provider 默认蓝色、跟随系统明暗。可以在同一页面嵌套不同主题。

样式不包含全局 reset，不修改页面布局、原生标题、原生按钮或表格。页面默认 `user-select: none`；输入框、日志和工作台代码区明确允许文字选择与复制。组件默认继承字体；Provider 提供字体和字号基线。不使用 Provider 时也可直接设置 `--cake-*` 变量。需要避免影响布局时，可将 Provider 作为已有容器使用并传入 `className`。

## 组件

所有组件和对应的 `*Props` 类型均从 `@a1knla/cakeui` 导出。主题类型是 `CakeTheme` / `CakeMode`，公共类型是 `Size` / `Tone`。

| 分类 | 组件                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------- |
| 主题 | CakeProvider                                                                                   |
| 基础 | Button、Card、Separator                                                                        |
| 输入 | TextBox、TextArea、NumberBox、ComboBox、CheckBox、RadioButton、Switch、Slider、Field、GroupBox |
| 导航 | Tabs、TabList、Tab、TabPanel、Breadcrumb、BreadcrumbItem、Pagination                           |
| 数据 | ListView、ListItem、Table、TableHead、TableBody、TableRow、TableHeader、TableCell、Avatar      |
| 状态 | Dot、Tag、Badge、Alert、ProgressBar、Spinner、Skeleton                                         |
| 浮层 | HoverTips、WhatsThis、Dialog、ContextMenu、MenuItem、MenuSeparator、Toast                      |
| 折叠 | Accordion、AccordionItem                                                                       |
| 日志 | LogView、LogEntry                                                                              |

### 原生优先

`TextBox` 就是 `input`，`TextArea` 就是 `textarea`，`NumberBox` 就是 `input type="number"`。`ComboBox` 直接接受 `option` / `optgroup`，下拉层采用与 ContextMenu 相同的圆角、阴影和选中反馈；底层仍为 select，保留原生键盘检索、验证、表单重置、事件与 ref。选项和分组会自动合并样式类名，支持 Fragment 嵌套。初版不实现可编辑搜索或虚拟化下拉列表。

ComboBox 的菜单外观使用 `appearance: base-select` 和 `::picker(select)`，当前预览浏览器已验证支持；不支持这些能力的浏览器会降级为系统选择器。[浏览器能力说明](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select)。

`CheckBox` / `RadioButton` / `Switch` 的 `children` 是标签，`name`、`checked`、`defaultChecked`、`onChange` 和 `ref` 传到内部 input。`className` 传到标签容器。Switch 使用原生 checkbox 实现，参与 FormData。RadioButton 的分组与方向键由相同 `name` 的原生 radio 负责。CheckBox 支持 `indeterminate`。

其余表单控件、Button 与简单容器的原生属性和 React 19 `ref` 直接透传。Dialog、ContextMenu、LogView 和 Toast 的类型不提供容器 ref；HoverTips / WhatsThis 只支持明确声明的属性。公开的额外能力如下表。

| 组件                   | 主要属性与默认值                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Button                 | `variant="default"`：default / primary / ghost / danger；`size="medium"`：small / medium / large；`loading=false`；默认 `type="button"` |
| Card                   | `padding="medium"`：none / small / medium / large                                                                                       |
| Field                  | `label`、`htmlFor`，可选 `description` / `error`；说明节点 id 为 `${htmlFor}-help`                                                      |
| GroupBox               | `label`，其余属性属于原生 fieldset，可用 `disabled` 禁用整个分组                                                                        |
| CakeProvider           | `theme="blue"`：blue / pink / gold；`mode="system"`：light / dark / system；`density="comfortable"`：comfortable / compact              |
| Dot、Tag、Badge、Alert | `tone`：neutral / accent / success / warning / danger；Dot、Tag 默认 neutral，Badge、Alert 默认 accent                                  |
| Tag                    | `onRemove` 显示移除按钮；`removeLabel` 默认 Remove，建议提供具体名称                                                                    |
| Avatar                 | 必填 `name`；可选 `src`、`children` 和 `size`；图片失败后显示 children 或名称前两个字符                                                 |
| ProgressBar            | 原生 progress，`max=100`；省略 value 为不确定进度，需给 `aria-label`                                                                    |
| Spinner                | `size="medium"`；默认无障碍标签 Loading，可用 `aria-label` 本地化                                                                       |
| Skeleton               | 默认对辅助技术隐藏，可用 style 设置尺寸                                                                                                 |
| Tabs                   | `defaultValue`、可选 `value` / `onValueChange`；`orientation="horizontal"`：horizontal / vertical                                       |
| Tab、TabPanel          | 同一个 `value` 将标签与内容关联；值在同一组中应唯一，默认值应对应未禁用的标签                                                           |
| Pagination             | `page` / `count` / `onPageChange`；页数从 1 开始；可本地化 `previousLabel` / `nextLabel` / `pageLabel`                                  |
| HoverTips              | `content`、单个 ReactElement children；`delay=180` ms，`placement="top"`：top / bottom                                                  |
| WhatsThis              | children 为说明；`label` 是问号按钮的无障碍名称                                                                                         |
| Dialog                 | 必填 `open` / `onOpenChange` / `title`；可选 description / footer / initialFocus；`closeOnBackdrop=true`；closeLabel 默认 Close         |
| ContextMenu            | children 为右键区域；`menu` 是 JSX 菜单内容；必填 `menuLabel`；`interactive` 默认 false，设为 true 开启按住右键、松开选择               |
| MenuItem               | 原生 button 属性；可选 `shortcut`、`danger`；shortcut 仅展示，绑定快捷键由应用负责                                                      |
| Toast                  | `open` / `onOpenChange`；`duration=4500` ms，0 为手动关闭；`tone="success"`；closeLabel 默认 Dismiss                                    |
| AccordionItem          | `title` + 原生 details 属性；支持 open / onToggle / name                                                                                |
| LogView                | `follow=true`；其余为 div 属性，可用 style / className 设置高度                                                                         |
| LogEntry               | 可选 `time`、`dateTime`、`level="info"`：info / debug / success / warning / error；children 为日志内容                                  |

### 表单标签与错误

Field 显式生成标签和说明，不克隆或推测 children 的结构。应用用原生 ARIA 关联错误，任意第三方控件也能放进 Field。

```tsx
<Field htmlFor="email" label="邮箱" error="请输入完整的邮箱地址。">
  <TextBox id="email" type="email" required aria-invalid="true" aria-describedby="email-help" />
</Field>
```

### 组合表格

没有 `columns` / `dataSource`，不接管排序、分页或行对象结构。底层仍是标准表格，支持 caption、scope、colSpan、rowSpan、aria-sort 等属性。

```tsx
<div style={{ overflowX: 'auto' }}>
  <Table>
    <caption>文件</caption>
    <TableHead>
      <TableRow>
        <TableHeader>名称</TableHeader>
        <TableHeader>操作</TableHeader>
      </TableRow>
    </TableHead>
    <TableBody>
      {files.map((file) => (
        <TableRow key={file.id}>
          <TableCell>{file.name}</TableCell>
          <TableCell>
            <Button onClick={() => open(file)}>打开</Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

ListView / ListItem 是 ul / li，只做列表排版。需要动作或链接时，在 ListItem 内放 Button 或原生 a；不自动把列表伪装成 listbox。

### 标签页

```tsx
<Tabs defaultValue="files">
  <TabList aria-label="工作空间">
    <Tab value="files">文件</Tab>
    <Tab value="activity">动态</Tab>
  </TabList>
  <TabPanel value="files">
    <FileList />
  </TabPanel>
  <TabPanel value="activity">
    <Activity />
  </TabPanel>
</Tabs>
```

方向键切换并自动激活，支持 Home / End、禁用项跳过、横向 RTL 和竖向导航。非活动面板保留挂载及表单状态，使用原生 `hidden` 隐藏。避免用外部 CSS 覆盖 hidden 的显示行为。每组使用 React useId 隔离 DOM id，允许嵌套。

### 弹窗与菜单

```tsx
<Dialog
  open={open}
  onOpenChange={setOpen}
  title="重命名"
  closeLabel="关闭"
  footer={<Button type="submit" form="rename">保存</Button>}
>
  <form id="rename" onSubmit={save}>
    <Field htmlFor="filename" label="文件名">
      <TextBox id="filename" name="filename" defaultValue="说明.md" />
    </Field>
  </form>
</Dialog>

<ContextMenu
  menuLabel="文件操作"
  aria-label="文件，可使用右键或 Shift F10 打开操作菜单"
  menu={
    <>
      <MenuItem onClick={rename}>重命名</MenuItem>
      <MenuSeparator />
      <MenuItem danger onClick={remove}>移至回收站</MenuItem>
    </>
  }
>
  <FileCard />
</ContextMenu>
```

Dialog 使用原生 showModal：顶层显示、背景 inert、焦点约束和关闭后恢复焦点均保留。初始焦点默认落到正文第一个可用表单控件；通过 `initialFocus={ref}` 可指定目标。Escape、关闭按钮和遮罩请求 `onOpenChange(false)`，受控状态由应用更新。`onCancel(event)` 中 preventDefault 可阻止 Escape 请求。遮罩关闭区分按下位置，拖拽选择文字到遮罩上不会误关闭。

ContextMenu 使用原生 Popover 顶层，不 portal 到 body，因此不会丢失嵌套主题。支持右键、Shift+F10、Menu 键、方向键、Home / End、键入检索、Escape 关闭与恢复焦点、外部点击关闭。MenuItem 的 onClick 中 preventDefault 可保持菜单打开。初版提供单层菜单；触屏应用应同时提供可见的操作入口。

传入 `interactive` 开启 Interactive 模式：鼠标右键按下时立即弹出菜单，整个触发区域下移 1px，使用与默认 Button 相同的 150ms / `cubic-bezier(0.29, 0, 0, 1)` 反馈。按住右键移到可用 MenuItem 后松开，会触发它的 onClick 并关闭菜单；松开在空白处、分隔线、禁用项或菜单外，仅结束按压反馈，菜单继续保持打开。判断依据为松开时光标实际覆盖的选项，不会把键盘焦点误当成悬停。

Interactive 的右键松开选择始终关闭菜单；普通点击和键盘选择仍支持 onClick 的 preventDefault 保持打开。外部再次点击、Escape、Tab、窗口失焦、滚动和调整窗口大小会关闭菜单。`onMouseDown` 中 preventDefault 可阻止 Interactive 按下触发。该模式使用手动 Popover 管理松开与关闭时机，仍保留原生顶层和全部键盘操作；工作台示例提供模式开关。

HoverTips 不产生额外 tab 停靠点，将说明 id 合并进唯一子元素的 aria-describedby。子元素应透传 ARIA 属性且可聚焦；禁用按钮无法接收焦点，建议使用 WhatsThis 提供帮助。提示支持键盘焦点、悬停、触屏点按、Escape、视口边界修正和悬停提示内容。说明应简短且不放交互控件。

### 日志与通知

```tsx
<LogView follow aria-label="运行日志">
  {logs.map((log, index) => (
    <LogEntry
      key={log.id}
      time={index > 0 && log.time === logs[index - 1].time ? undefined : log.time}
      dateTime={log.isoTime}
      level={log.level}
    >
      {log.message}
    </LogEntry>
  ))}
</LogView>
```

日志可选择和复制。用户位于底部时，新内容自动跟随；向上翻阅时不抢回滚动位置，滚回底部后恢复跟随。筛选、清空、时间格式、相邻时间省略、条数限制均由调用方组合。初版不内置虚拟滚动，大量日志应由应用截断或窗口化。

Toast 是单条受控通知。显示时间支持暂停后恢复剩余计时（悬停或焦点进入时暂停）；多个通知的排队、位置和去重由应用决定。默认使用 status 实时区域，错误 tone 使用 assertive。不要在浮层已打开时依赖页面底部 Toast 传达关键结果，应直接在当前浮层内反馈。

## 主题与动效

```tsx
<CakeProvider theme="gold" mode="dark" density="compact" className="my-workspace">
  <AppContent />
</CakeProvider>
```

```scss
.my-workspace {
  --cake-radius-small: 8px;
  --cake-control-height: 36px;
  --cake-font: 'Noto Sans SC', system-ui, sans-serif;
}
```

主变量为 `--cake-bg`、`--cake-surface`、`--cake-text`、`--cake-muted`、`--cake-accent`、`--cake-accent-soft`、`--cake-accent-ink`、`--cake-line`。完整定义在 `src/components/CakeProvider/index.scss`。

内置圆角 10 / 14 / 20 / 26px；快速、常规、较慢动效分别为 150 / 200 / 250ms；位移曲线 `cubic-bezier(0.29, 0, 0, 1)`。减少动态效果时过渡时间归零，持续旋转与脉冲关闭。颜色变化与立即更新的业务状态不依赖动画结束事件。

## 结构与边界

```text
src/
  components/Foo/index.tsx + index.scss
  hooks/useControllable.ts
  styles/_mixins.scss
  index.ts                  # 公开 API
  styles.scss               # 独立样式入口
demo/App/
  index.tsx + index.scss
  components/               # 工作台专用组件
tests/
  components.test.tsx
  browser/playground.spec.ts
```

具名函数使用 function，样式显式写完整 className，不使用 BEM 或 `&-suffix` 拼接，不为全局标签附加库样式。公共组件没有业务数据结构、网络请求、持久化或图标依赖。

这次初版以 ARCH.md 中列出的零件为中心，补齐常见基础控件；不包含日期日历、树、富文本编辑器、拖拽系统、多级菜单和虚拟列表。日期、文件上传等可用原生 `TextBox type="date"` / `type="file"` 组合。参考依据与决策见 [设计记录](docs/design.md)。
