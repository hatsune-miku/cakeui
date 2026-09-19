import { createRoot } from 'react-dom/client'

import { Button, CakeProvider, Card, CheckBox, HoverTips, ProgressBar, TextBox } from '../../../../src'

import '../../../../src/styles.scss'

function Fixture() {
  return (
    <CakeProvider theme="pink" mode="light" density="compact" data-testid="light">
      <Card padding="small">
        <Button variant="primary">发送文件</Button>
        <CheckBox defaultChecked>发送剪贴板</CheckBox>
        <TextBox aria-label="设备名" defaultValue="AnyDrop" />
        <ProgressBar value={50} aria-label="传输进度" />
        <div style={{ paddingLeft: 80, letterSpacing: 2 }}>
          <HoverTips content="同源主题浮层">
            <Button style={{ marginLeft: 6 }}>帮助</Button>
          </HoverTips>
        </div>
      </Card>
      <CakeProvider theme="pink" mode="dark" density="compact" data-testid="dark">
        <Card padding="small">
          <Button variant="primary">接收文件</Button>
        </Card>
      </CakeProvider>
      <CakeProvider theme="blue" mode="light" data-testid="nested-blue">
        <Button>嵌套默认密度</Button>
      </CakeProvider>
    </CakeProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
