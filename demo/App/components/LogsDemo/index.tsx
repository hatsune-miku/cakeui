import { useState } from 'react'

import { Button, ComboBox, LogEntry, type LogEntryProps, LogView, Switch } from '../../../../src'
import { Icon } from '../Icon'
import { Section } from '../Section'

const initial = [
  { id: 1, time: '14:32:01', level: 'info' as const, text: '工作空间已就绪。' },
  { id: 2, time: '14:32:01', level: 'debug' as const, text: '读取本地配置，共 8 个资源。' },
  { id: 3, time: '14:32:02', level: 'info' as const, text: '开始同步设计资源…' },
  { id: 4, time: '14:32:03', level: 'warning' as const, text: '品牌资源.zip 已有更新，保留本地副本。' },
  { id: 5, time: '14:32:04', level: 'success' as const, text: '同步完成，所有资源均可用。' },
]
export function LogsDemo() {
  const [logs, setLogs] = useState<{ id: number; time: string; level: LogEntryProps['level']; text: string }[]>(initial)
  const [follow, setFollow] = useState(true)
  const [filter, setFilter] = useState('all')
  return (
    <Section
      id="logs"
      title="日志视图"
      subtitle="LogView · LogEntry · 自由选择、筛选与滚动"
      code={
        '<LogView follow aria-label="同步日志">\n  {logs.map((log) => (\n    <LogEntry key={log.id} time={log.time} level={log.level}>\n      {log.message}\n    </LogEntry>\n  ))}\n</LogView>'
      }
    >
      <div className="demo-between">
        <div className="demo-log-filter">
          <ComboBox aria-label="日志级别" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">全部级别</option>
            <option value="warning">警告</option>
            <option value="success">成功</option>
            <option value="info">信息</option>
          </ComboBox>
        </div>
        <Switch checked={follow} onChange={(event) => setFollow(event.target.checked)}>
          跟随日志
        </Switch>
      </div>
      <LogView follow={follow} aria-label="示例日志">
        {logs
          .filter((log) => filter === 'all' || log.level === filter)
          .map((log) => (
            <LogEntry key={log.id} time={log.time} level={log.level}>
              {log.text}
            </LogEntry>
          ))}
        {logs.length === 0 && <span className="demo-muted">日志已清空。</span>}
      </LogView>
      <div className="demo-between">
        <span className="demo-footnote">向上翻阅时暂停跟随</span>
        <div className="demo-row">
          <Button variant="ghost" size="small" onClick={() => setLogs([])}>
            清空
          </Button>
          <Button
            size="small"
            onClick={() =>
              setLogs((current) => [
                ...current,
                {
                  id: (current.at(-1)?.id ?? 0) + 1,
                  time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                  level: 'info',
                  text: '收到一条新的资源更新。',
                },
              ])
            }
          >
            <Icon name="plus" size={13} />
            追加日志
          </Button>
        </div>
      </div>
    </Section>
  )
}
