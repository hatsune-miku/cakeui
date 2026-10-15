import { useState } from 'react'
import { createRoot } from 'react-dom/client'

import { Slide, SlideDeck, SlideNavigator, SlideText } from '../../../../src/presentation'

import '../../../../src/presentation/styles.scss'

function Fixture() {
  const [index, setIndex] = useState(3)
  const [child, setChild] = useState(false)
  return (
    <main>
      <SlideNavigator
        index={index}
        onIndexChange={setIndex}
        context={`${index + 1} / 8${child ? ' · Child page' : ''}`}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i}>Chapter {i + 1}</span>
        ))}
      </SlideNavigator>
      <button onClick={() => setChild(!child)}>Toggle child</button>
      <SlideDeck focusIndicator="none" index={index} onIndexChange={setIndex}>
        {Array.from({ length: 8 }, (_, i) => (
          <Slide key={i} aria-label={`Chapter ${i + 1}`}>
            <SlideText>Selectable chapter {i + 1} text</SlideText>
          </Slide>
        ))}
      </SlideDeck>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<Fixture />)
