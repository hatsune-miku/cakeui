import { useEffect, useRef, useState } from 'react'

import { Button, HoverTips, WhatsThis } from '../../../../src'
import { Icon } from '../Icon'
import { Section } from '../Section'

export function ActionsDemo() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  function save() {
    setLoading(true)
    setSaved(false)
    timer.current = setTimeout(() => {
      setLoading(false)
      setSaved(true)
    }, 900)
  }
  return (
    <Section
      id="actions"
      title="按钮与提示"
      subtitle="Button · HoverTips · WhatsThis"
      code={
        '<Button variant="primary" onClick={save}>保存更改</Button>\n<Button loading={saving}>保存中</Button>\n<HoverTips content="保存当前设置">\n  <Button>保存</Button>\n</HoverTips>\n<WhatsThis label="关于同步">更改会自动同步。</WhatsThis>'
      }
    >
      <div className="demo-row">
        <Button variant="primary" loading={loading} onClick={save}>
          <Icon name={saved ? 'check' : 'plus'} size={16} />
          {saved ? '已保存' : loading ? '保存中' : '保存更改'}
        </Button>
        <Button
          onClick={() => {
            setSaved(false)
          }}
        >
          默认按钮
        </Button>
        <Button variant="ghost" onClick={save}>
          轻量操作
          <Icon name="arrow" size={15} />
        </Button>
      </div>
      <div className="demo-row">
        <Button size="small">小尺寸</Button>
        <Button disabled>不可用</Button>
        <HoverTips content="直接执行操作，提示不会挡住你的下一步。">
          <Button variant="ghost">
            <Icon name="download" size={16} />
            悬停查看提示
          </Button>
        </HoverTips>
        <WhatsThis label="关于按钮">按钮默认不会提交表单。需要提交时，设置 type="submit"。</WhatsThis>
      </div>
      <div className="demo-footnote">
        <span className="demo-tiny-line" />
        150 ms · 响应先于动效
      </div>
    </Section>
  )
}
