import { useState } from 'react'
import { createRoot } from 'react-dom/client'

import { Slide, SlideDeck, SlideHeader, SlideNavigator, SlideText } from '@a1knla/cakeui/presentation'
import '@a1knla/cakeui/presentation/style.css'

function App() {
  const [index, setIndex] = useState(0)
  return (
    <main>
      <SlideNavigator aria-label="汇报主线" index={index} onIndexChange={setIndex} context={`主线 ${index + 1} / 2`}>
        <span>01 项目进展</span>
        <span>02 交付方式</span>
      </SlideNavigator>
      <SlideDeck theme="pink" aria-label="项目汇报" index={index} onIndexChange={setIndex} focusIndicator="none">
        <Slide>
          <SlideHeader title="项目进展" />
          <SlideText>在自己的工程中编辑页面，再构建为一个 HTML 文件。</SlideText>
        </Slide>
        <Slide>
          <SlideHeader title="交付方式" />
          <SlideText>数轴与页面共享索引，图片和样式一起内嵌到离线文件。</SlideText>
        </Slide>
      </SlideDeck>
    </main>
  )
}

createRoot(document.getElementById('app')!).render(<App />)
