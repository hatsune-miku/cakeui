import { Button, CakeProvider, Card, CheckBox, Dot, Switch, Tag, TextBox } from '../../../../src'
import { themePresets } from '../../../../src/theme'

import './index.scss'

const themes = [themePresets[1], themePresets[0], ...themePresets.slice(2)].map((preset) => ({
  value: preset.id,
  label: preset.name,
  hex: preset.reference,
}))
export function Tokens() {
  return (
    <div className="demo-tokens">
      <div className="demo-token-themes">
        {themes.map((theme) => (
          <CakeProvider key={theme.value} theme={theme.value} mode="light" className="demo-token-theme">
            <div className="demo-between">
              <strong>{theme.label}</strong>
              <span className="demo-token-value">{theme.hex}</span>
            </div>
            <Button variant="primary">主要操作</Button>
            <TextBox aria-label={theme.label + '示例输入'} placeholder="输入一些内容" />
            <div className="demo-between">
              <Switch aria-label={theme.label + '示例开关'} defaultChecked />
              <CheckBox defaultChecked>已选择</CheckBox>
              <Tag tone="accent">进行中</Tag>
            </div>
          </CakeProvider>
        ))}
      </div>
      <div className="demo-token-themes">
        {themes.map((theme) => (
          <CakeProvider key={theme.value} theme={theme.value} mode="dark" className="demo-token-theme">
            <div className="demo-between">
              <strong>{theme.label} · 深色</strong>
              <Dot tone="accent" />
            </div>
            <Button variant="primary">主要操作</Button>
            <TextBox aria-label={theme.label + '深色示例输入'} placeholder="输入一些内容" />
            <div className="demo-between">
              <Switch aria-label={theme.label + '深色示例开关'} defaultChecked />
              <Tag tone="accent">进行中</Tag>
            </div>
          </CakeProvider>
        ))}
      </div>
      <div className="demo-token-detail">
        <Card>
          <h2 className="demo-card-title">默认圆角</h2>
          <div className="demo-radius-row">
            {[10, 16, 28, 32].map((radius) => (
              <div key={radius} className="demo-radius-sample" style={{ borderRadius: radius }}>
                {radius}
              </div>
            ))}
          </div>
          <p className="demo-panel-text">控件 10px，浮层 16px，大容器 28px，弹窗 32px；通过半径变量覆盖。</p>
        </Card>
        <Card>
          <h2 className="demo-card-title">动效时长与曲线</h2>
          <div className="demo-motion-track">
            <Button className="demo-motion-button" variant="primary">
              按下试试
            </Button>
          </div>
          <div className="demo-between">
            <span className="demo-token-value">150 / 200 / 250 ms</span>
            <Tag>缓出</Tag>
          </div>
          <p className="demo-panel-text">cubic-bezier(0.29, 0, 0, 1)，自动尊重减少动态效果设置。</p>
        </Card>
      </div>
      <Card>
        <h2 className="demo-card-title">自定义 CSS 变量</h2>
        <pre className="demo-doc-code">
          <code>
            {
              '.my-workspace {\n  --cake-radius-small: 8px;\n  --cake-control-height: 36px;\n  --cake-font: "Noto Sans SC", system-ui, sans-serif;\n}'
            }
          </code>
        </pre>
      </Card>
    </div>
  )
}
