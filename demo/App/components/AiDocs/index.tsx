import { useEffect, useState } from 'react'

import { Alert, Button, Card, Spinner, Tag } from '../../../../src'

import './index.scss'

export function AiDocs() {
  const [content, setContent] = useState('')
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setFailed(false)
    fetch('/llms-full.txt', { signal: controller.signal })
      .then((response) => {
        if (!response.ok || !response.headers.get('content-type')?.includes('text/plain'))
          throw new Error('Documentation unavailable')
        return response.text()
      })
      .then(setContent)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [attempt])
  return (
    <div className="demo-ai-docs">
      <Card padding="large" className="demo-ai-introduction">
        <div className="demo-row">
          <Tag tone="accent">AI READY</Tag>
          <h2 className="demo-card-title">把这份文档交给 AI</h2>
        </div>
        <p className="demo-panel-text">
          从集成到修改：完整 API、默认值、原生属性、组合示例、主题变量和交互边界。
          纯文本可直接读取，文档随组件和工作台一同更新。
        </p>
        <div className="demo-ai-links">
          <a className="demo-ai-link" href="/llms-full.txt">
            打开完整纯文本 ↗
          </a>
          <a className="demo-ai-link" href="/llms.txt">
            简短索引 llms.txt ↗
          </a>
          <a className="demo-ai-link" href="/llms-full.txt" download="cakeui-technical-reference.txt">
            下载全文 ↓
          </a>
        </div>
        <code className="demo-ai-url">https://gallery.vanillacake.cn/llms-full.txt</code>
      </Card>
      {failed ? (
        <Alert tone="warning">
          文档暂时无法加载。
          <Button size="small" onClick={() => setAttempt((current) => current + 1)}>
            重新加载
          </Button>
        </Alert>
      ) : content ? (
        <pre className="demo-ai-content" tabIndex={0} aria-label="CakeUI 完整技术文档">
          {content}
        </pre>
      ) : (
        <Spinner aria-label="正在加载技术文档" />
      )}
    </div>
  )
}
