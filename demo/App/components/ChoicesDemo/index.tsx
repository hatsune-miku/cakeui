import { useState } from 'react'

import { CheckBox, GroupBox, RadioButton, Slider, Switch } from '../../../../src'
import { Section } from '../Section'

export function ChoicesDemo() {
  const [volume, setVolume] = useState(65)
  return (
    <Section
      id="choices"
      title="开关与选项"
      subtitle="CheckBox · Switch · RadioButton · Slider · GroupBox"
      code={
        '<Switch defaultChecked>自动保存</Switch>\n<CheckBox name="notice" defaultChecked>桌面通知</CheckBox>\n<RadioButton name="quality" value="original">原始质量</RadioButton>\n<Slider aria-label="音量" min={0} max={100} defaultValue={65} />'
      }
    >
      <div className="demo-between">
        <span>自动保存</span>
        <Switch aria-label="自动保存" defaultChecked />
      </div>
      <div className="demo-row">
        <CheckBox defaultChecked>桌面通知</CheckBox>
        <CheckBox>启动时打开</CheckBox>
        <CheckBox disabled>组织管理</CheckBox>
      </div>
      <GroupBox label="传输质量">
        <div className="demo-row">
          <RadioButton name="quality" value="original" defaultChecked>
            原始质量
          </RadioButton>
          <RadioButton name="quality" value="balanced">
            均衡
          </RadioButton>
          <RadioButton name="quality" value="small">
            节省空间
          </RadioButton>
        </div>
      </GroupBox>
      <div className="demo-stack-small">
        <label className="demo-between" htmlFor="volume">
          提示音量<span className="demo-muted">{volume}%</span>
        </label>
        <Slider id="volume" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
      </div>
    </Section>
  )
}
