import { Accordion, AccordionItem, Alert, Card, Tag } from '../../../../src'

import './index.scss'

export function Guide() {
  return (
    <div className="demo-guide">
      <Alert tone="neutral">0.1.0 初版 · npm 包名 @a1knla/cakeui，需要 React 19 或更高版本。</Alert>
      <Card padding="large">
        <div className="demo-row">
          <Tag tone="accent">01</Tag>
          <h2 className="demo-card-title">从 npm 安装</h2>
        </div>
        <pre className="demo-doc-code">
          <code>
            {
              '# 在已有 React 19 项目中\nnpm install @a1knla/cakeui\n\n# 验证本地改动时，在 CakeUI 目录打包\nnpm pack\n# 在消费项目安装生成的文件\nnpm install /path/to/a1knla-cakeui-0.1.0.tgz'
            }
          </code>
        </pre>
      </Card>
      <Card padding="large">
        <div className="demo-row">
          <Tag tone="accent">02</Tag>
          <h2 className="demo-card-title">引入组件和样式</h2>
        </div>
        <pre className="demo-doc-code">
          <code>
            {
              'import { CakeProvider, Button, TextBox } from \'@a1knla/cakeui\'\nimport \'@a1knla/cakeui/style.css\'\n\nexport function App() {\n  return (\n    <CakeProvider theme="blue" mode="system">\n      <TextBox aria-label="名称" placeholder="输入名称" />\n      <Button variant="primary">保存</Button>\n    </CakeProvider>\n  )\n}'
            }
          </code>
        </pre>
      </Card>
      <Card padding="large">
        <div className="demo-row">
          <Tag tone="accent">03</Tag>
          <h2 className="demo-card-title">按熟悉的方式使用</h2>
        </div>
        <Accordion>
          <AccordionItem title="沿用原生属性" open>
            输入组件支持 name、required、disabled、value、defaultValue、onChange 和 ref。按钮默认
            type="button"，需要提交表单时指定 type="submit"。
          </AccordionItem>
          <AccordionItem title="组件负责样式与交互，应用负责数据">
            直接用 children 组合 Table、ListView、Tabs、ContextMenu 和
            LogView。排序、筛选、请求和存储由应用决定，不需要适配数据格式。
          </AccordionItem>
          <AccordionItem title="主题是局部的">
            CakeProvider 可以嵌套，支持 light、dark、system 和两种密度。不使用 Provider
            时默认浅蓝主题变量，不修改页面布局或全局标签样式。
          </AccordionItem>
          <AccordionItem title="为现代浏览器构建">
            需要 React 19 和支持 dialog、Popover API 的现代浏览器。构建产物为 ESM 和独立 CSS，不含
            Tailwind、图标库或其他运行时依赖。
          </AccordionItem>
        </Accordion>
      </Card>
      <Card padding="large">
        <div className="demo-row">
          <Tag tone="accent">04</Tag>
          <h2 className="demo-card-title">给 AI 的完整技术参考</h2>
        </div>
        <p className="demo-panel-text">逐个组件说明 API、默认值和交互边界，并提供完整类型与可验证的组合示例。</p>
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
