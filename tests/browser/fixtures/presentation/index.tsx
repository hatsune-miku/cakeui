import { useState } from 'react'
import { createRoot } from 'react-dom/client'

import { Slide, SlideColumns, SlideDeck, SlideText } from '../../../../src/presentation'

import '../../../../src/presentation/styles.scss'

function Fixture() {
  const [index, setIndex] = useState(0)
  const [reading, setReading] = useState(false)
  const [innerReading, setInnerReading] = useState(true)
  return (
    <main>
      <button type="button" onClick={() => setIndex(1)}>
        External next
      </button>
      <button type="button" onClick={() => setReading(!reading)}>
        Toggle document
      </button>
      <button type="button" onClick={() => setInnerReading(!innerReading)}>
        Toggle inner document
      </button>
      <SlideDeck
        aria-label="Fixture"
        index={index}
        onIndexChange={setIndex}
        view={reading ? 'document' : 'presentation'}
      >
        <Slide aria-label="Editing">
          <input aria-label="Notes" defaultValue="Draft" />
          <details>
            <summary>Details</summary>More content
          </details>
          <SlideDeck aria-label="Inner" view={innerReading ? 'document' : 'presentation'} controls={false}>
            <Slide>
              <SlideText>Inner one</SlideText>
            </Slide>
            <Slide>
              <SlideColumns>
                <SlideText>Inner two left</SlideText>
                <SlideText>Inner two right</SlideText>
              </SlideColumns>
            </Slide>
          </SlideDeck>
        </Slide>
        <Slide aria-label="Overflow" ratio="4:3">
          {Array.from({ length: 35 }, (_, i) => (
            <SlideText key={i}>Paragraph {i + 1}: long content must remain reachable.</SlideText>
          ))}
          <input aria-label="Last field" />
        </Slide>
      </SlideDeck>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
