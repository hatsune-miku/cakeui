import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { SlideSubmenu } from '../../../../src/presentation'

import '../../../../src/presentation/styles.scss'

function Fixture() {
  const root = useRef<HTMLDivElement>(null)
  const [right, setRight] = useState(false)
  const [value, setValue] = useState('Default')
  return (
    <main>
      <style>{`.fixture-menu { position: fixed; margin: 0; inset: auto; top: 100px; box-sizing: border-box; width: 240px; padding: 7px; border: 1px solid #ccc; background: white; color: #29313a; font: 14px Arial; } .fixture-menu:popover-open {display: flex;flex-direction: column;} .fixture-menu button {font: inherit; padding: 10px; background: white; color: #29313a; border: 0; text-align: left;} .fixture-menu button:focus-visible {outline: 2px solid #3d658f;} .fixture-menu button:disabled {color: #666;}`}</style>
      <h1>Presentation submenu</h1>
      <button onClick={() => root.current!.showPopover()}>Open menu</button>
      <button onClick={() => setRight(!right)}>Move root</button>
      <output>{value}</output>
      <div
        ref={root}
        role="menu"
        aria-label="Root"
        popover="manual"
        className="fixture-menu"
        style={{ left: right ? 'calc(100vw - 264px)' : 24 }}
        onKeyDown={(event) => {
          if (event.key === 'Tab' || event.key === 'Escape') {
            event.preventDefault()
            root.current!.hidePopover()
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]')].filter(
              (item) => item.closest('[role="menu"]') === event.currentTarget
            )
            items[(items.indexOf(document.activeElement as HTMLElement) + 1) % items.length].focus()
          }
        }}
      >
        <button role="menuitem">Before</button>
        <SlideSubmenu label={<strong>Font</strong>} menuLabel="Font choices" backLabel="Back to root">
          <button role="menuitemradio" disabled aria-checked={false}>
            Unavailable
          </button>
          {['Default', 'Display'].map((option) => (
            <button
              key={option}
              role="menuitemradio"
              aria-checked={option === value}
              onClick={() => {
                setValue(option)
                root.current!.hidePopover()
              }}
            >
              {option}
            </button>
          ))}
        </SlideSubmenu>
        <button role="menuitem">After</button>
      </div>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<Fixture />)
