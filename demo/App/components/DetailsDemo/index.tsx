import { Accordion, AccordionItem, Card, Separator, Tag } from '../../../../src'
import { Section } from '../Section'

export function DetailsDemo() {
  return (
    <Section
      id="details"
      title="容器与折叠"
      subtitle="Card · Accordion · Separator"
      code={
        '<Card>\n  <strong>工作空间</strong>\n  <Separator />\n  <Accordion>\n    <AccordionItem title="高级设置">设置内容</AccordionItem>\n  </Accordion>\n</Card>'
      }
    >
      <Card padding="none">
        <div className="demo-between">
          <span className="demo-inline">
            工作空间<Tag tone="accent">个人</Tag>
          </span>
          <span className="demo-footnote">最近更新 · 今天</span>
        </div>
        <Separator />
        <Accordion>
          <AccordionItem title="需要额外的样式框架吗？" name="guide" open>
            不需要。引入一份 CSS 即可使用全部组件，主题通过 CSS 变量调整。
          </AccordionItem>
          <AccordionItem title="表格的数据格式由谁决定？" name="guide">
            由你的应用决定。Table 接受 children，用标准的表头、行和单元格组织内容。
          </AccordionItem>
          <AccordionItem title="支持键盘和减少动态效果吗？" name="guide">
            支持原生表单操作、方向键切换标签页、Escape 关闭浮层，以及系统的减少动态效果设置。
          </AccordionItem>
        </Accordion>
      </Card>
    </Section>
  )
}
