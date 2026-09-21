# CakeUI

React 19 组件库，使用 TypeScript 和 SCSS，提供 48 个基础组件、15 个 HTML 幻灯片组件、蓝 / 粉 / 金主题及明暗模式。

[Gallery](https://gallery.vanillacake.cn) · [技术文档](https://gallery.vanillacake.cn/?page=docs) · [npm](https://www.npmjs.com/package/@a1knla/cakeui)

## npm

```sh
npm install @a1knla/cakeui
```

需要 React 19+，以及支持原生 dialog 和 Popover API 的现代浏览器。

```tsx
import { Button, CakeProvider } from '@a1knla/cakeui'
import '@a1knla/cakeui/style.css'

export function App() {
  return (
    <CakeProvider theme="blue" mode="system">
      <Button variant="primary" onClick={() => console.log('保存')}>
        保存
      </Button>
    </CakeProvider>
  )
}
```

`theme`：`blue` / `pink` / `gold`；`mode`：`light` / `dark` / `system`。组件支持原生 HTML 属性，通过 JSX children 组合。

HTML 幻灯片使用独立入口 `@a1knla/cakeui/presentation` 和样式 `@a1knla/cakeui/presentation/style.css`，支持固定比例、连续阅读、键盘翻页、全屏和打印。参见[示例](https://gallery.vanillacake.cn/?page=presentation)与[API / 完整代码](docs/ai.md#41-html-幻灯片组件)。此入口尚未包含于 npm `0.3.0`，新版本发布前使用文档中的本地打包安装流程。

## CDN

普通 HTML 直接引用，无需安装 npm 或另引 React：

```html
<link rel="stylesheet" href="https://vanillacake.cn/cakeui-dist/cakeui.css" />
<div id="app"></div>
<script src="https://vanillacake.cn/cakeui-dist/cakeui.min.js"></script>
<script>
  const { React, createRoot, Button } = CakeUI
  createRoot(document.getElementById('app')).render(React.createElement(Button, null, '保存'))
</script>
```

基础组件从 `CakeUI` 取用，幻灯片从 `CakeUI.presentation` 取用；样式包含两者。[完整示例](https://gallery.vanillacake.cn/browser.html) · [CDN / npm 用法对照](docs/ai.md#2-安装入口与执行环境)。默认 CDN 地址随稳定发版更新，目前为源码预览；长期保存的演示可在正式发布后使用固定版本地址。

## 文档

- [API 与示例](docs/ai.md)
- [AI 文档索引](https://gallery.vanillacake.cn/llms.txt) · [完整纯文本](https://gallery.vanillacake.cn/llms-full.txt)
- [发布](docs/publishing.md) · [部署](docs/deployment.md) · [设计记录](docs/design.md)

## 开发

需要 Node.js 22.12+ 和 npm。

```sh
npm ci
npm run dev
```

提交前运行 `npm run check`、`npm run test:browser` 和 `npm run test:package`。
