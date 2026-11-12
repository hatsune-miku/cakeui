import { createRef, useState } from 'react'

import { describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen } from '@testing-library/react'

import { Slide, SlideDeck, SlideNavigator, type SlidePlayback, SlidePlaybackMenu } from '../src/presentation'

function NavigationFixture() {
  const [index, setIndex] = useState(3)
  const [mode, setMode] = useState<SlidePlayback>('tree')
  return (
    <>
      <SlideNavigator index={index} onIndexChange={setIndex} context={`${index + 1} / 8`}>
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i}>Chapter {i + 1}</span>
        ))}
      </SlideNavigator>
      <div role="menu">
        <SlidePlaybackMenu value={mode} onValueChange={setMode} />
      </div>
    </>
  )
}

describe('presentation navigation', () => {
  it('exposes only two neighbours on each side and supports repeated arrow navigation with focus', () => {
    render(<NavigationFixture />)
    const nav = screen.getByRole('navigation')
    expect(screen.getAllByRole('button')).toHaveLength(5)
    const selected = screen.getByRole('button', { name: 'Chapter 4' })
    expect(selected).toHaveAttribute('aria-current', 'step')
    selected.focus()
    fireEvent.keyDown(selected, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: 'Chapter 5' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: 'Chapter 6' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(screen.getByRole('button', { name: 'Chapter 8' })).toHaveFocus()
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(nav).toHaveTextContent('8 / 8')
    fireEvent.keyDown(document.activeElement!, { key: 'Home' })
    expect(screen.getByRole('button', { name: 'Chapter 1' })).toHaveFocus()
  })

  it('respects native props, refs, cancellation, empty items and bounded controlled indices', () => {
    const ref = createRef<HTMLElement>()
    const changed = vi.fn()
    const { rerender } = render(
      <SlideNavigator
        ref={ref}
        aria-label="Chapters"
        index={99}
        onIndexChange={changed}
        onKeyDown={(event) => event.preventDefault()}
      >
        <span>One</span>
        <span>Two</span>
      </SlideNavigator>
    )
    expect(ref.current).toBe(screen.getByRole('navigation', { name: 'Chapters' }))
    expect(screen.getByRole('button', { name: 'Two' })).toHaveAttribute('aria-current', 'step')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Two' }), { key: 'ArrowLeft' })
    expect(changed).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'One' }))
    expect(changed).toHaveBeenCalledWith(0)
    rerender(<SlideNavigator index={NaN} onIndexChange={changed} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('composes playback radio items and keeps focusable decks when the outer outline is disabled', () => {
    render(
      <>
        <NavigationFixture />
        <SlideDeck focusIndicator="none">
          <Slide>Selectable text</Slide>
          <Slide>Next</Slide>
        </SlideDeck>
      </>
    )
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Flat playback' }))
    expect(screen.getByRole('menuitemradio', { name: 'Flat playback' })).toBeChecked()
    expect(screen.getByRole('menuitemradio', { name: 'Tree playback' })).not.toBeChecked()
    const deck = screen.getByRole('region')
    deck.focus()
    expect(deck).toHaveFocus()
    expect(deck).toHaveAttribute('data-focus-indicator', 'none')
    fireEvent.keyDown(deck, { key: 'ArrowRight' })
    expect(screen.getByRole('group', { name: 'Slide 2 / 2' })).toHaveTextContent('Next')
  })
})
