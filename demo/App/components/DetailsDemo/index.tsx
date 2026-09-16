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
          <AccordionItem title="样式与主题" name="guide" open>
            引入 @a1knla/cakeui/style.css，使用 CSS 变量调整主题。
          </AccordionItem>
          <AccordionItem title="表格数据" name="guide">
            Table 接受 children，用标准的表头、行和单元格组织内容，数据格式由应用决定。
          </AccordionItem>
          <AccordionItem title="键盘与动效" name="guide">
            支持原生表单操作、方向键切换标签页、Escape 关闭浮层，以及系统的减少动态效果设置。
          </AccordionItem>
        </Accordion>
      </Card>
    </Section>
  )
}
