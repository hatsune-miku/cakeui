import { Accordion, AccordionItem, Alert, Card, Tag } from '../../../../src'

import './index.scss'

export function Guide() {
  return (
    <div className="demo-guide">
      <Alert tone="neutral">0.1.0 本地初版，尚未发布到 npm。可以先构建并通过本地打包文件集成。</Alert>
      <Card padding="large">
        <div className="demo-row">
          <Tag tone="accent">01</Tag>
          <h2 className="demo-card-title">打包并安装</h2>
        </div>
        <pre className="demo-doc-code">
          <code>
            {
              '# 在 CakeUI 目录\nnpm install\nnpm run build\nnpm pack\n\n# 在你的 React 19 项目\nnpm install /path/to/cakeui-0.1.0.tgz'
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
              'import { CakeProvider, Button, TextBox } from \'cakeui\'\nimport \'cakeui/style.css\'\n\nexport function App() {\n  return (\n    <CakeProvider theme="pink" mode="system">\n      <TextBox aria-label="名称" placeholder="输入名称" />\n      <Button variant="primary">保存</Button>\n    </CakeProvider>\n  )\n}'
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
    </div>
  )
}
