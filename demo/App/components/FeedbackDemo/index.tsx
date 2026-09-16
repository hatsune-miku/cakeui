import { useState } from 'react'

import { Alert, Badge, Button, Dot, ProgressBar, Skeleton, Spinner, Tag } from '../../../../src'
import { Icon } from '../Icon'
import { Section } from '../Section'

export function FeedbackDemo() {
  const [progress, setProgress] = useState(68)
  const [tag, setTag] = useState(true)
  return (
    <Section
      id="feedback"
      title="状态与反馈"
      subtitle="Tag · Badge · Alert · ProgressBar · Spinner · Skeleton"
      code={
        '<Tag tone="success">已同步</Tag>\n<Dot tone="success" aria-label="在线" />\n<Alert tone="success">所有更改已保存。</Alert>\n<ProgressBar aria-label="同步进度" value={68} />\n<Spinner aria-label="正在加载" />'
      }
    >
      <div className="demo-row">
        <Tag tone="accent">进行中</Tag>
        <Tag tone="success">已完成</Tag>
        <Tag tone="warning">待处理</Tag>
        {tag ? (
          <Tag onRemove={() => setTag(false)} removeLabel="移除草稿标签">
            草稿
          </Tag>
        ) : (
          <Button size="small" variant="ghost" onClick={() => setTag(true)}>
            恢复标签
          </Button>
        )}
        <Badge>12</Badge>
      </div>
      <Alert tone="success">
        <Icon name="check" size={16} />
        所有更改已保存。
      </Alert>
      <div className="demo-stack-small">
        <div className="demo-between">
          <span className="demo-inline">
            <Dot tone="accent" />
            正在同步资源
          </span>
          <Button
            variant="ghost"
            size="small"
            onClick={() => setProgress((value) => (value >= 100 ? 0 : Math.min(100, value + 16)))}
            aria-label="推进同步进度"
          >
            {progress}%<Icon name="arrow" size={13} />
          </Button>
        </div>
        <ProgressBar value={progress} aria-label="同步进度" />
      </div>
      <div className="demo-row">
        <Spinner aria-label="示例加载状态" />
        <div className="demo-skeleton-lines">
          <Skeleton style={{ width: '80%' }} />
          <Skeleton style={{ width: '55%' }} />
        </div>
        <span className="demo-footnote">加载中</span>
      </div>
    </Section>
  )
}
