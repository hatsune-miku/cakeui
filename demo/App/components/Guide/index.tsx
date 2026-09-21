import { Accordion, AccordionItem, Card } from '../../../../src'

import './index.scss'

export function Guide() {
  return (
    <div className="demo-guide">
      <p className="demo-panel-text">
        React 工程通过 npm 引入；普通 HTML 可直接使用 CDN。两种方式使用相同的组件 API，CDN 版本内置 React。 需要支持
        dialog 和 Popover API 的现代浏览器。
      </p>
      <Card padding="large">
        <h2 className="demo-card-title">npm：安装</h2>
        <p className="demo-panel-text">在已有 React / React DOM 19+ 项目中执行，JSX / TSX 由项目构建工具编译。</p>
        <pre className="demo-doc-code">
          <code>npm install @a1knla/cakeui</code>
        </pre>
      </Card>
      <Card padding="large">
        <h2 className="demo-card-title">npm：基础组件和样式</h2>
        <pre className="demo-doc-code">
          <code>
            {
              'import { CakeProvider, Button, TextBox } from \'@a1knla/cakeui\'\nimport \'@a1knla/cakeui/style.css\'\n\nexport function App() {\n  return (\n    <CakeProvider theme="blue" mode="system">\n      <TextBox aria-label="名称" placeholder="输入名称" />\n      <Button variant="primary">保存</Button>\n    </CakeProvider>\n  )\n}'
            }
          </code>
        </pre>
      </Card>
      <Card padding="large">
        <h2 className="demo-card-title">npm：HTML 幻灯片</h2>
        <p className="demo-panel-text">
          presentation 是同包的 Web 子入口，只用幻灯片时无需 CakeProvider 或基础样式。已发布的 npm 0.3.0
          尚未包含此入口，新版本发布前请按技术文档从源码打包安装，或使用下方 CDN。
        </p>
        <pre className="demo-doc-code">
          <code>{`import { SlideDeck, Slide, SlideHeader } from '@a1knla/cakeui/presentation'
import '@a1knla/cakeui/presentation/style.css'

export function Slides() {
  return (
    <SlideDeck aria-label="项目汇报">
      <Slide aria-label="本周进展">
        <SlideHeader title="本周进展" />
      </Slide>
    </SlideDeck>
  )
}`}</code>
        </pre>
      </Card>
      <Card padding="large">
        <h2 className="demo-card-title">CDN：普通 HTML</h2>
        <p className="demo-panel-text">
          引入一个 JS 和一个 CSS 即可；无需 npm、额外 React、import map 或 JSX 编译器。应用代码放在库脚本之后。
        </p>
        <pre className="demo-doc-code">
          <code>{`<link rel="stylesheet" href="https://vanillacake.cn/cakeui-dist/cakeui.css">
<div id="app"></div>
<script src="https://vanillacake.cn/cakeui-dist/cakeui.min.js"></script>
<script>
  const { React, createRoot, Button } = CakeUI
  createRoot(document.getElementById('app')).render(
    React.createElement(Button, null, '保存')
  )
</script>`}</code>
        </pre>
        <p className="demo-panel-text">
          基础组件从 CakeUI 取用；幻灯片从 CakeUI.presentation 取用，如 SlideDeck、Slide、SlideHeader。 使用相同的
          React.createElement 和 createRoot 挂载，完整 CSS 已包含两者。自定义组件的 hooks 使用 CakeUI.React。
        </p>
        <p className="demo-panel-text">
          默认 CDN 地址随稳定发版更新，目前是源码预览；正式发布后可用 releases/版本号/ 固定 JS 和 CSS。 外部 URL
          需要联网；完全离线的单 HTML 需要内嵌脚本、样式和媒体。
        </p>
        <div className="demo-row">
          <a className="demo-link" href="/browser.html" target="_blank" rel="noreferrer">
            打开 CDN 完整示例 ↗
          </a>
          <a className="demo-link" href="/?page=docs">
            npm / CDN 用法对照与完整代码 ↗
          </a>
        </div>
      </Card>
      <Card padding="large">
        <h2 className="demo-card-title">接口约定</h2>
        <Accordion>
          <AccordionItem title="沿用原生属性" open>
            输入组件支持 name、required、disabled、value、defaultValue、onChange 和 ref。按钮默认
            type="button"，需要提交表单时指定 type="submit"。
          </AccordionItem>
          <AccordionItem title="JSX 组合">
            直接用 children 组合 Table、ListView、Tabs、ContextMenu 和
            LogView。排序、筛选、请求和存储由应用决定，不需要适配数据格式。
          </AccordionItem>
          <AccordionItem title="主题作用域">
            CakeProvider 可以嵌套，支持 light、dark、system 和两种密度。不使用 Provider
            时默认浅蓝主题变量，不修改页面布局或全局标签样式。
          </AccordionItem>
          <AccordionItem title="构建产物">
            npm 提供 ESM、TypeScript 声明文件和独立 CSS，React / React DOM 由项目提供。CDN 提供普通 script 构建，内置
            React / React DOM，并通过全局 CakeUI 提供组件。
          </AccordionItem>
          <AccordionItem title="幻灯片控制">
            SlideDeck 自带逐页展示、连续阅读、比例适配、翻页和全屏。切换阅读模式与比例的按钮由页面提供，分别修改 view 和
            ratio；章节跳转列表通过 index / onIndexChange 与组件共享页码。
          </AccordionItem>
        </Accordion>
      </Card>
      <Card padding="large">
        <h2 className="demo-card-title">技术文档</h2>
        <div className="demo-row">
          <a className="demo-link" href="/?page=docs">
            阅读 AI 技术文档 ↗
          </a>
          <a className="demo-link" href="/llms-full.txt">
            打开完整纯文本 ↗
          </a>
        </div>
      </Card>
    </div>
  )
}
