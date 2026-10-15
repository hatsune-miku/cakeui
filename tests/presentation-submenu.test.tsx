import { createRef } from 'react'

import { describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen } from '@testing-library/react'

import { SlideSubmenu } from '../src/presentation'

describe('SlideSubmenu', () => {
  it('forwards native button props and refs and permits consumers to cancel opening', () => {
    const ref = createRef<HTMLButtonElement>()
    const clicked = vi.fn((event) => event.preventDefault())
    render(
      <div role="menu">
        <SlideSubmenu
          ref={ref}
          label={<strong>Options</strong>}
          menuLabel="Choices"
          title="Native title"
          onClick={clicked}
          onKeyDown={(event) => event.preventDefault()}
        >
          <button role="menuitem">Choice</button>
        </SlideSubmenu>
      </div>
    )
    const trigger = screen.getByRole('menuitem', { name: 'Options' })
    expect(ref.current).toBe(trigger)
    expect(trigger).toHaveAttribute('title', 'Native title')
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'ArrowRight' })
    expect(clicked).toHaveBeenCalledOnce()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu', { name: 'Choices' })).not.toBeInTheDocument()
  })

  it('keeps disabled submenus closed', () => {
    render(
      <SlideSubmenu disabled label="Options" menuLabel="Choices">
        <button role="menuitem">Choice</button>
      </SlideSubmenu>
    )
    const trigger = screen.getByRole('menuitem', { name: 'Options' })
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
    fireEvent.click(trigger)
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
