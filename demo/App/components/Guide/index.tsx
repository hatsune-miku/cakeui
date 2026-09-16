import { Accordion, AccordionItem, Card } from '../../../../src'

import './index.scss'

export function Guide() {
  return (
    <div className="demo-guide">
      <p className="demo-panel-text">需要 React 19+，以及支持 dialog 和 Popover API 的现代浏览器。</p>
      <Card padding="large">
        <h2 className="demo-card-title">安装</h2>
        <pre className="demo-doc-code">
          <code>npm install @a1knla/cakeui</code>
        </pre>
      </Card>
      <Card padding="large">
        <h2 className="demo-card-title">引入组件和样式</h2>
        <pre className="demo-doc-code">
          <code>
            {
              'import { CakeProvider, Button, TextBox } from \'@a1knla/cakeui\'\nimport \'@a1knla/cakeui/style.css\'\n\nexport function App() {\n  return (\n    <CakeProvider theme="blue" mode="system">\n      <TextBox aria-label="名称" placeholder="输入名称" />\n      <Button variant="primary">保存</Button>\n    </CakeProvider>\n  )\n}'
            }
          </code>
        </pre>
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
            ESM、TypeScript 声明文件和独立 CSS。运行时依赖为 React 和 React DOM。
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
