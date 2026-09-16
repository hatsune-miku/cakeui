import { useState } from 'react'

import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CheckBox,
  ComboBox,
  Dialog,
  Field,
  ListItem,
  ListView,
  ProgressBar,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Tag,
  TextBox,
} from '../../../../src'
import { Icon } from '../Icon'

import './index.scss'

const startingTasks = [
  { id: 1, title: '整理组件命名与原生属性', category: '设计', done: true },
  { id: 2, title: '检查粉、蓝、金三套主题', category: '设计', done: false },
  { id: 3, title: '验证键盘操作与焦点顺序', category: '开发', done: false },
  { id: 4, title: '补充组件组合示例', category: '文档', done: false },
]
export function Example() {
  const [tasks, setTasks] = useState(startingTasks)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('设计')
  const [filter, setFilter] = useState('all')
  const completed = tasks.filter((task) => task.done).length
  const visible = tasks.filter((task) => filter === 'all' || (filter === 'done' ? task.done : !task.done))
  function addTask() {
    if (!title.trim()) return
    setTasks([
      ...tasks,
      { id: Math.max(0, ...tasks.map((task) => task.id)) + 1, title: title.trim(), category, done: false },
    ])
    setTitle('')
    setOpen(false)
  }
  return (
    <div className="demo-example">
      <div className="demo-example-main">
        <Card padding="large">
          <div className="demo-between">
            <div>
              <span className="demo-eyebrow">个人工作空间</span>
              <h2 className="demo-example-title">今天，做一点有用的事。</h2>
            </div>
            <Avatar name="hatsune-miku" size="large" />
          </div>
          <div className="demo-between">
            <span className="demo-muted">组件库 · 初版准备</span>
            <Button variant="primary" onClick={() => setOpen(true)}>
              <Icon name="plus" size={16} />
              新建任务
            </Button>
          </div>
          <Tabs value={filter} defaultValue="all" onValueChange={setFilter}>
            <TabList aria-label="任务筛选">
              <Tab value="all">
                全部<Badge>{tasks.length}</Badge>
              </Tab>
              <Tab value="active">待完成</Tab>
              <Tab value="done">已完成</Tab>
            </TabList>
            {['all', 'active', 'done'].map((key) => (
              <TabPanel key={key} value={key}>
                <ListView aria-label="任务列表">
                  {visible.map((task) => (
                    <ListItem key={task.id}>
                      <CheckBox
                        checked={task.done}
                        onChange={(event) =>
                          setTasks((current) =>
                            current.map((item) =>
                              item.id === task.id ? { ...item, done: event.target.checked } : item
                            )
                          )
                        }
                      >
                        {task.title}
                      </CheckBox>
                      <span className="demo-grow" />
                      <Tag tone={task.done ? 'success' : 'neutral'}>{task.done ? '已完成' : task.category}</Tag>
                    </ListItem>
                  ))}
                </ListView>
                {!visible.length && <p className="demo-empty">这里暂时没有任务。</p>}
              </TabPanel>
            ))}
          </Tabs>
        </Card>
        <Alert tone="neutral">这是一个本地交互示例。任务会在刷新后恢复，主题设置会保留。</Alert>
      </div>
      <Card>
        <span className="demo-eyebrow">当前进度</span>
        <div className="demo-example-progress">
          {completed}
          <span className="demo-muted"> / {tasks.length}</span>
        </div>
        <ProgressBar value={completed} max={tasks.length || 1} aria-label="任务完成进度" />
        <p className="demo-panel-text">勾选任务，进度随之更新。零件之间没有隐藏的数据约定。</p>
        <Tag tone="accent">由基础组件自由组合</Tag>
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="新建任务"
        closeLabel="关闭新建任务"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>取消</Button>
            <Button variant="primary" type="submit" form="new-task-form" disabled={!title.trim()}>
              创建任务
            </Button>
          </>
        }
      >
        <form
          className="demo-stack"
          id="new-task-form"
          onSubmit={(event) => {
            event.preventDefault()
            addTask()
          }}
        >
          <Field htmlFor="task-title" label="任务名称">
            <TextBox
              autoFocus
              id="task-title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="接下来准备做什么？"
            />
          </Field>
          <Field htmlFor="task-category" label="分类">
            <ComboBox id="task-category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>设计</option>
              <option>开发</option>
              <option>文档</option>
            </ComboBox>
          </Field>
        </form>
      </Dialog>
    </div>
  )
}
