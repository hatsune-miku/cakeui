import { useState } from 'react'

import { Button, ContextMenu, Dialog, Field, MenuItem, MenuSeparator, Switch, TextBox } from '../../../../src'
import { Icon } from '../Icon'
import { Section } from '../Section'

export interface OverlaysDemoProps {
  notify: (message: string) => void
}
export function OverlaysDemo({ notify }: OverlaysDemoProps) {
  const [dialog, setDialog] = useState(false)
  const [name, setName] = useState('设计资源')
  const [interactive, setInteractive] = useState(true)
  return (
    <Section
      id="overlays"
      title="浮层与菜单"
      subtitle="Dialog · ContextMenu · Toast"
      code={
        '<Dialog open={open} onOpenChange={setOpen} title="重命名">\n  <TextBox aria-label="名称" defaultValue="设计资源" />\n</Dialog>\n<ContextMenu interactive menuLabel="文件操作" menu={\n  <MenuItem onClick={rename}>重命名</MenuItem>\n}>\n  <div>按住右键，移到选项后松开</div>\n</ContextMenu>'
      }
    >
      <div className="demo-row">
        <Button onClick={() => setDialog(true)}>
          <Icon name="layers" size={16} />
          打开对话框
        </Button>
        <Button variant="ghost" onClick={() => notify('这是一条可关闭的通知。')}>
          显示通知
        </Button>
      </div>
      <Switch checked={interactive} onChange={(event) => setInteractive(event.target.checked)}>
        Interactive 模式
      </Switch>
      <ContextMenu
        interactive={interactive}
        menuLabel="文件操作"
        aria-label="设计资源，右键或 Shift F10 打开菜单"
        menu={
          <>
            <MenuItem onClick={() => setDialog(true)} shortcut="F2">
              重命名
            </MenuItem>
            <MenuItem onClick={() => notify('已创建副本：' + name + ' 副本')}>创建副本</MenuItem>
            <MenuItem disabled>复制共享链接</MenuItem>
            <MenuSeparator />
            <MenuItem danger onClick={() => notify('已将示例文件移至回收站。')}>
              移至回收站
            </MenuItem>
          </>
        }
      >
        <div className="demo-context-target">
          <Icon name="box" size={25} />
          <span>
            {name}
            <span className="demo-secondary-line">
              {interactive ? '按住右键，移到选项后松开' : '右键，或聚焦后按 Shift + F10'}
            </span>
          </span>
          <span className="demo-context-dots" aria-hidden="true">
            ···
          </span>
        </div>
      </ContextMenu>
      <Dialog
        open={dialog}
        onOpenChange={setDialog}
        title="重命名资源"
        description="一个清楚的名字，让文件更容易被找到。"
        closeLabel="关闭重命名"
        footer={
          <>
            <Button onClick={() => setDialog(false)}>取消</Button>
            <Button variant="primary" type="submit" form="rename-form" disabled={!name.trim()}>
              保存名称
            </Button>
          </>
        }
      >
        <form
          id="rename-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (!name.trim()) return
            setDialog(false)
            notify('名称已保存为「' + name.trim() + '」。')
          }}
        >
          <Field label="资源名称" htmlFor="rename-input">
            <TextBox
              id="rename-input"
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
        </form>
      </Dialog>
    </Section>
  )
}
