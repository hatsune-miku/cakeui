import { type ReactNode, useState } from 'react'

import { Button } from '../../../../src'
import { Icon } from '../Icon'

import './index.scss'

export interface SectionProps {
  id: string
  title: string
  subtitle: string
  code: string
  children: ReactNode
  wide?: boolean
}
export function Section({ id, title, subtitle, code, children, wide = false }: SectionProps) {
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setCopyError(false)
    } catch {
      setCopyError(true)
    }
  }
  return (
    <section className="demo-section" id={id} data-wide={wide} aria-labelledby={id + '-title'}>
      <div className="demo-section-heading">
        <div>
          <h2 className="demo-section-title" id={id + '-title'}>
            {title}
          </h2>
          <p className="demo-section-subtitle">{subtitle}</p>
        </div>
        <Button
          variant="ghost"
          size="small"
          aria-label={showCode ? `隐藏${title}代码` : `查看${title}代码`}
          aria-expanded={showCode}
          onClick={() => setShowCode(!showCode)}
        >
          <Icon name="code" size={16} />
        </Button>
      </div>
      <div className="demo-section-preview">{children}</div>
      {showCode && (
        <div className="demo-section-code">
          <div className="demo-code-toolbar">
            <span>React · TypeScript</span>
            <Button variant="ghost" size="small" onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} size={14} />
              {copied ? '已复制' : '复制'}
            </Button>
          </div>
          <pre className="demo-code">
            <code>{code}</code>
          </pre>
          {copyError && (
            <p className="demo-copy-error" role="alert">
              浏览器未允许剪贴板访问，可以选中代码复制。
            </p>
          )}
        </div>
      )}
    </section>
  )
}
