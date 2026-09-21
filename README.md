# CakeUI

React 19 组件库，使用 TypeScript 和 SCSS，提供 48 个基础组件、15 个 HTML 幻灯片组件、蓝 / 粉 / 金主题及明暗模式。

[Gallery](https://gallery.vanillacake.cn) · [技术文档](https://gallery.vanillacake.cn/?page=docs) · [npm](https://www.npmjs.com/package/@a1knla/cakeui)

## 安装

```sh
npm install @a1knla/cakeui
```

需要 React 19+，以及支持原生 dialog 和 Popover API 的现代浏览器。

## 使用

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

## 文档

普通 HTML 可通过外部 `cakeui.min.js` 与 `cakeui.css` 使用内置 React 的浏览器版本：[直接引用示例](https://gallery.vanillacake.cn/browser.html) · [用法与版本规则](docs/ai.md#通过外部-script-url-使用)。每次 npm 发版会自动更新远端浏览器分发；目前默认地址为源码预览。

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
