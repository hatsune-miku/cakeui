import { useEffect, useState } from 'react'

import { Alert, Button, Spinner } from '../../../../src'

import './index.scss'

export function AiDocs() {
  const [content, setContent] = useState('')
  const [failure, setFailure] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setFailure('')
    fetch('/llms-full.txt', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`服务器返回 HTTP ${response.status}`)
        const type = response.headers.get('content-type')
        if (!type?.includes('text/plain')) throw new Error(`服务器返回的不是纯文本，而是 ${type ?? '未知类型'}`)
        return response.text()
      })
      .then(setContent)
      .catch((error: Error) => {
        if (controller.signal.aborted) return
        setFailure(error instanceof TypeError ? '无法连接到服务器' : error.message)
      })
    return () => controller.abort()
  }, [attempt])
  return (
    <div className="demo-ai-docs">
      <div className="demo-ai-links">
        <a className="demo-text-link" href="/llms-full.txt">
          打开完整纯文本
        </a>
        <a className="demo-text-link" href="/llms.txt">
          简短索引 llms.txt
        </a>
        <a className="demo-text-link" href="/llms-full.txt" download="cakeui-technical-reference.txt">
          下载全文
        </a>
      </div>
      {failure ? (
        <Alert tone="warning">
          <span className="demo-grow">文档加载失败，因为{failure}。</span>
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
