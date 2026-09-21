import { useState } from 'react'

import { createExampleSlides, slideNames } from './slides'

import { SlideDeck, type SlideDeckProps, type SlideRatio } from '../../../../src/presentation'

import '../../../../src/presentation/styles.scss'
import './index.scss'

export const presentationLabels = {
  previous: '上一页',
  next: '下一页',
  enterFullscreen: '全屏演示',
  exitFullscreen: '退出全屏',
  fullscreenUnavailable: '浏览器未允许全屏，请使用独立演示页或浏览器全屏。',
  empty: '暂无幻灯片',
  slide: '第',
}

export function PresentationDemo({
  theme = 'blue',
  mode = 'light',
  standalone = false,
}: Pick<SlideDeckProps, 'theme' | 'mode'> & { standalone?: boolean }) {
  const [index, setIndex] = useState(0)
  const [view, setView] = useState<'presentation' | 'document'>('presentation')
  const [ratio, setRatio] = useState<SlideRatio>('16:9')
  return (
    <div className="presentation-demo">
      <div className="presentation-demo-toolbar">
        <div className="presentation-demo-options" role="group" aria-label="浏览方式">
          <button
            type="button"
            className="presentation-demo-button"
            aria-pressed={view === 'presentation'}
            onClick={() => setView('presentation')}
          >
            逐页演示
          </button>
          <button
            type="button"
            className="presentation-demo-button"
            aria-pressed={view === 'document'}
            onClick={() => setView('document')}
          >
            连续阅读
          </button>
        </div>
        <div className="presentation-demo-options" role="group" aria-label="画布比例">
          {(['16:9', '4:3', '16:10'] as const).map((item) => (
            <button
              type="button"
              key={item}
              className="presentation-demo-button"
              aria-pressed={ratio === item}
              onClick={() => setRatio(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {standalone ? (
          <button type="button" className="presentation-demo-button" onClick={() => window.print()}>
            打印 / PDF
          </button>
        ) : (
          <a
            className="presentation-demo-link"
            href={`/slides.html?theme=${theme}&mode=${mode}`}
            target="_blank"
            rel="noreferrer"
          >
            独立演示 / 打印 ↗
          </a>
        )}
      </div>
      <SlideDeck
        aria-label="HTML 幻灯片示例"
        index={index}
        onIndexChange={setIndex}
        view={view}
        ratio={ratio}
        theme={theme}
        mode={mode}
        labels={presentationLabels}
      >
        {createExampleSlides()}
      </SlideDeck>
      <div className="presentation-demo-outline" role="group" aria-label="选择幻灯片">
        {slideNames.map((name, position) => (
          <button
            type="button"
            key={name}
            className="presentation-demo-page"
            aria-pressed={position === index}
            onClick={() => {
              setIndex(position)
              setView('presentation')
            }}
          >
            <span className="presentation-demo-page-number">{String(position + 1).padStart(2, '0')}</span>
            {name}
          </button>
        ))}
      </div>
      <p className="presentation-demo-help">
        聚焦画布后，用 ← / →、Page Up / Down、空格翻页，Home / End 跳至首尾。窄屏可切换连续阅读。
      </p>
      {!standalone && (
        <details className="presentation-demo-source">
          <summary className="presentation-demo-summary">导入与最小示例</summary>
          <pre className="presentation-demo-code">
            <code>{`import { SlideDeck, Slide, SlideHeader, SlideText } from '@a1knla/cakeui/presentation'\nimport '@a1knla/cakeui/presentation/style.css'\n\n<SlideDeck aria-label="项目汇报">\n  <Slide aria-label="本周进展">\n    <SlideHeader title="本周进展" />\n    <SlideText>完成组件与文档。</SlideText>\n  </Slide>\n</SlideDeck>`}</code>
          </pre>
          <a className="presentation-demo-link" href="/?page=docs">
            完整 API 与维护文档 ↗
          </a>
        </details>
      )}
    </div>
  )
}
