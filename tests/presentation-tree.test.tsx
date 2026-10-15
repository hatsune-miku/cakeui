import { createRef, useState } from 'react'

import { describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen } from '@testing-library/react'

import { SlideTree, SlideTreeItem } from '../src/presentation'

function Fixture() {
  const [selected, setSelected] = useState('parent')
  return (
    <>
      <button onClick={() => setSelected('leaf')}>External leaf</button>
      <SlideTree>
        <SlideTreeItem label="Parent" current={selected === 'parent'} onClick={() => setSelected('parent')}>
          <SlideTreeItem label="Child" current={selected === 'child'} onClick={() => setSelected('child')}>
            <SlideTreeItem label="Leaf" current={selected === 'leaf'} onClick={() => setSelected('leaf')} />
          </SlideTreeItem>
          <SlideTreeItem label="Sibling" current={selected === 'sibling'} onClick={() => setSelected('sibling')} />
        </SlideTreeItem>
      </SlideTree>
    </>
  )
}

describe('nested slide tree', () => {
  it('keeps a true nested list and provides local keyboard collapse, parent and visible-order navigation', () => {
    const outer = vi.fn()
    render(
      <div onKeyDown={outer}>
        <Fixture />
      </div>
    )
    const parent = screen.getByRole('button', { name: 'Parent' })
    const child = screen.getByRole('button', { name: 'Child' })
    const leaf = screen.getByRole('button', { name: 'Leaf' })
    expect(leaf.closest('li')?.parentElement?.closest('li')).toContainElement(child)
    parent.focus()
    fireEvent.keyDown(parent, { key: 'ArrowRight' })
    expect(child).toHaveFocus()
    fireEvent.keyDown(child, { key: 'ArrowRight' })
    expect(leaf).toHaveFocus()
    fireEvent.keyDown(leaf, { key: 'ArrowLeft' })
    expect(child).toHaveFocus()
    fireEvent.keyDown(child, { key: 'ArrowLeft' })
    expect(child).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Leaf' })).not.toBeInTheDocument()
    fireEvent.keyDown(child, { key: 'ArrowDown' })
    expect(screen.getByRole('button', { name: 'Sibling' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'Home' })
    expect(parent).toHaveFocus()
    expect(outer).not.toHaveBeenCalled()
  })

  it('reveals a selected descendant after external navigation, keeping its nested controls mounted', () => {
    render(<Fixture />)
    const parent = screen.getByRole('button', { name: 'Parent' })
    fireEvent.keyDown(parent, { key: 'ArrowLeft' })
    expect(screen.queryByRole('button', { name: 'Leaf' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'External leaf' }))
    expect(screen.getByRole('button', { name: 'Leaf' })).toHaveAttribute('aria-current', 'page')
    expect(parent).toHaveAttribute('aria-expanded', 'true')
  })

  it('forwards native button props/ref and supports controlled expansion and cancellation', () => {
    const ref = createRef<HTMLButtonElement>()
    const changed = vi.fn()
    const clicked = vi.fn()
    render(
      <SlideTree onKeyDown={(event) => event.preventDefault()}>
        <SlideTreeItem
          ref={ref}
          label="Controlled"
          expanded={false}
          onExpandedChange={changed}
          onClick={clicked}
          name="chapter"
        >
          <SlideTreeItem label="Nested" />
        </SlideTreeItem>
      </SlideTree>
    )
    expect(ref.current).toHaveAttribute('name', 'chapter')
    fireEvent.click(ref.current!)
    expect(clicked).toHaveBeenCalledOnce()
    fireEvent.keyDown(ref.current!, { key: 'ArrowRight' })
    expect(changed).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Expand child slides' }))
    expect(changed).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('button', { name: 'Nested' })).not.toBeInTheDocument()
  })
})
