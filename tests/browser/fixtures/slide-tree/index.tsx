import { useState } from 'react'
import { createRoot } from 'react-dom/client'

import { SlideTree, SlideTreeItem } from '../../../../src/presentation'

import '../../../../src/presentation/styles.scss'

function Fixture() {
  const [selected, setSelected] = useState('Root')
  return (
    <main>
      <h1>Slide navigation</h1>
      <button onClick={() => setSelected('Leaf')}>Select leaf externally</button>
      <SlideTree style={{ width: 232, maxHeight: 360 }}>
        <SlideTreeItem
          label="Root"
          thumbnail="Root preview"
          current={selected === 'Root'}
          onClick={() => setSelected('Root')}
        >
          <SlideTreeItem
            label="Child"
            thumbnail="Child preview"
            current={selected === 'Child'}
            onClick={() => setSelected('Child')}
          >
            <SlideTreeItem
              label="Leaf"
              thumbnail="Leaf preview"
              current={selected === 'Leaf'}
              onClick={() => setSelected('Leaf')}
            />
          </SlideTreeItem>
          <SlideTreeItem label="Sibling" thumbnail="Sibling preview" />
        </SlideTreeItem>
      </SlideTree>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<Fixture />)
