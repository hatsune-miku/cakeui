import { createRef } from 'react'
import { renderToString } from 'react-dom/server'

import { describe, expect, it, vi } from 'vitest'

import { act, fireEvent, render, screen } from '@testing-library/react'

import { Slide, SlideCode, SlideDeck, SlideHeader, SlideImage, SlideTitle } from '../src/presentation'

describe('presentation contracts', () => {
  it('collects nested fragments, bounds navigation, and preserves inactive form state', () => {
    const changed = vi.fn()
    const { container } = render(
      <SlideDeck onIndexChange={changed}>
        <>
          <Slide aria-label="One">
            <input aria-label="Notes" defaultValue="draft" />
          </Slide>
          {false}
          <>
            <Slide aria-label="Two">Two</Slide>
          </>
        </>
      </SlideDeck>
    )
    const deck = screen.getByRole('region', { name: 'Presentation' })
    const notes = screen.getByRole('textbox')
    fireEvent.change(notes, { target: { value: 'edited' } })
    fireEvent.keyDown(deck, { key: 'ArrowRight' })
    expect(changed).toHaveBeenLastCalledWith(1)
    expect(container.querySelector('.cake-slide-deck-page')).toHaveAttribute('inert')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled()
    fireEvent.keyDown(deck, { key: 'ArrowRight' })
    expect(changed).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(deck, { key: 'Home' })
    expect(screen.getByRole('textbox')).toHaveValue('edited')
    fireEvent.keyDown(deck, { key: 'End' })
    fireEvent.keyDown(deck, { key: ' ', shiftKey: true })
    expect(changed).toHaveBeenLastCalledWith(0)
  })

  it('supports controlled requests, invalid indices, shrinking children, empty decks, and document view', () => {
    const change = vi.fn()
    const slides = [<Slide key="a">A</Slide>, <Slide key="b">B</Slide>]
    const { rerender } = render(
      <SlideDeck index={0} onIndexChange={change}>
        {slides}
      </SlideDeck>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(change).toHaveBeenLastCalledWith(1)
    expect(screen.getByRole('group')).toHaveAccessibleName('Slide 1 / 2')
    rerender(
      <SlideDeck index={50} onIndexChange={change}>
        {slides}
      </SlideDeck>
    )
    expect(screen.getByRole('group')).toHaveAccessibleName('Slide 2 / 2')
    rerender(
      <SlideDeck index={50} onIndexChange={change}>
        {slides[0]}
      </SlideDeck>
    )
    expect(screen.getByRole('group')).toHaveAccessibleName('Slide 1 / 1')
    expect(change).toHaveBeenCalledTimes(1)
    rerender(<SlideDeck index={NaN}>{slides}</SlideDeck>)
    expect(screen.getByRole('group')).toHaveAccessibleName('Slide 1 / 2')
    rerender(<SlideDeck view="document">{slides}</SlideDeck>)
    expect(screen.getAllByRole('group')).toHaveLength(2)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    rerender(<SlideDeck labels={{ empty: '暂无内容' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('0 / 0暂无内容')
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled()
  })

  it('keeps shortcuts local and lets editing and caller handlers consume keys', () => {
    const changed = vi.fn()
    const { rerender } = render(
      <SlideDeck onIndexChange={changed}>
        <Slide>
          <input aria-label="Edit" />
          <a href="#">Link</a>
          <SlideCode>{'const page = 1'}</SlideCode>
        </Slide>
        <Slide>Second</Slide>
      </SlideDeck>
    )
    for (const target of [
      screen.getByRole('textbox'),
      screen.getByRole('link'),
      screen.getByText('const page = 1'),
      document.body,
    ]) {
      fireEvent.keyDown(target, { key: 'ArrowRight' })
    }
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowRight', ctrlKey: true })
    expect(changed).not.toHaveBeenCalled()
    rerender(
      <SlideDeck onIndexChange={changed} onKeyDown={(event) => event.preventDefault()}>
        <Slide>A</Slide>
        <Slide>B</Slide>
      </SlideDeck>
    )
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowRight' })
    expect(changed).not.toHaveBeenCalled()
  })

  it('does not route inner deck shortcuts to an outer deck and supports looping', () => {
    const outer = vi.fn()
    const inner = vi.fn()
    render(
      <SlideDeck aria-label="Outer" onIndexChange={outer}>
        <Slide>
          <SlideDeck aria-label="Inner" loop onIndexChange={inner}>
            <Slide>A</Slide>
            <Slide>B</Slide>
          </SlideDeck>
        </Slide>
        <Slide>Outer second</Slide>
      </SlideDeck>
    )
    fireEvent.keyDown(screen.getByRole('region', { name: 'Inner' }), { key: 'ArrowLeft' })
    expect(inner).toHaveBeenLastCalledWith(1)
    expect(outer).not.toHaveBeenCalled()
  })

  it('recovers focus from a hidden controlled page and forwards native refs and handlers', () => {
    const deckRef = createRef<HTMLDivElement>()
    const slideRef = createRef<HTMLElement>()
    const headingRef = createRef<HTMLHeadingElement>()
    const imageRef = createRef<HTMLImageElement>()
    const click = vi.fn()
    const slides = [
      <Slide key="a" ref={slideRef} id="first" onClick={click} className="custom-slide">
        <SlideTitle ref={headingRef} level={1}>
          A
        </SlideTitle>
        <button type="button">Inside</button>
        <SlideImage ref={imageRef} alt="Diagram" src="diagram.svg" />
      </Slide>,
      <Slide key="b">
        <SlideHeader title="B" />
      </Slide>,
    ]
    const { rerender } = render(
      <SlideDeck ref={deckRef} index={0}>
        {slides}
      </SlideDeck>
    )
    expect(slideRef.current).toHaveClass('custom-slide')
    expect(headingRef.current?.tagName).toBe('H1')
    expect(imageRef.current?.alt).toBe('Diagram')
    fireEvent.click(slideRef.current!)
    expect(click).toHaveBeenCalledTimes(1)
    act(() => screen.getByRole('button', { name: 'Inside' }).focus())
    rerender(
      <SlideDeck ref={deckRef} index={1}>
        {slides}
      </SlideDeck>
    )
    expect(deckRef.current).toHaveFocus()
  })

  it('handles rejected fullscreen requests without unhandled rejections', async () => {
    const error = new Error('Denied')
    const failed = vi.fn()
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'requestFullscreen')
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockRejectedValue(error),
    })
    try {
      render(
        <SlideDeck onFullscreenError={failed}>
          <Slide>One</Slide>
        </SlideDeck>
      )
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' })))
      expect(failed).toHaveBeenCalledWith(error)
      expect(screen.getByRole('alert')).toHaveTextContent('Fullscreen is unavailable')
    } finally {
      if (original) Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', original)
      else Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen')
    }
  })

  it('renders safely on the server and rejects unsupported slide wrappers', () => {
    const html = renderToString(
      <SlideDeck>
        <Slide>
          <SlideCode>{'<script>unsafe()</script>'}</SlideCode>
        </Slide>
        <Slide>Second</Slide>
      </SlideDeck>
    )
    expect(html).toContain('&lt;script&gt;unsafe()&lt;/script&gt;')
    expect(html).toContain('aria-hidden="true"')
    expect(() =>
      renderToString(
        <SlideDeck>
          <div>Not a slide</div>
        </SlideDeck>
      )
    ).toThrow('SlideDeck children must be Slide')
  })
})
