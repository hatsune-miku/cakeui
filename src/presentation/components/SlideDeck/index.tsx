import {
  type CSSProperties,
  Children,
  type ComponentPropsWithRef,
  Fragment,
  type ReactElement,
  type ReactNode,
  isValidElement,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { cx } from '../../../utils'
import { Slide, type SlideProps, type SlideRatio } from '../Slide'

export interface SlideDeckLabels {
  previous: string
  next: string
  enterFullscreen: string
  exitFullscreen: string
  fullscreenUnavailable: string
  empty: string
  slide: string
}

export interface SlideDeckProps extends ComponentPropsWithRef<'div'> {
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  view?: 'presentation' | 'document'
  ratio?: SlideRatio
  theme?: 'blue' | 'pink' | 'gold'
  mode?: 'light' | 'dark' | 'system'
  keyboard?: boolean
  controls?: boolean
  loop?: boolean
  fullscreen?: boolean
  labels?: Partial<SlideDeckLabels>
  onFullscreenError?: (error: unknown) => void
}

const defaultLabels: SlideDeckLabels = {
  previous: 'Previous slide',
  next: 'Next slide',
  enterFullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',
  fullscreenUnavailable: 'Fullscreen is unavailable',
  empty: 'No slides',
  slide: 'Slide',
}

function collectSlides(children: ReactNode, prefix = ''): { key: string; element: ReactElement<SlideProps> }[] {
  const result: { key: string; element: ReactElement<SlideProps> }[] = []
  Children.forEach(children, (child, position) => {
    if (child == null || typeof child === 'boolean') return
    const key = `${prefix}/${isValidElement(child) && child.key != null ? child.key : position}`
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
      result.push(...collectSlides(child.props.children, key))
    } else if (isValidElement<SlideProps>(child) && child.type === Slide) {
      result.push({ key, element: child })
    } else {
      throw new Error('SlideDeck children must be Slide elements, arrays, or fragments of Slide elements.')
    }
  })
  return result
}

function clampIndex(index: number, count: number) {
  return Math.min(Math.max(0, Number.isFinite(index) ? Math.trunc(index) : 0), Math.max(0, count - 1))
}

export function SlideDeck({
  index,
  defaultIndex = 0,
  onIndexChange,
  view = 'presentation',
  ratio = '16:9',
  theme = 'blue',
  mode = 'light',
  keyboard = true,
  controls = true,
  loop = false,
  fullscreen = true,
  labels,
  onFullscreenError,
  ref,
  className,
  children,
  style,
  onKeyDown,
  onFocusCapture,
  ...props
}: SlideDeckProps) {
  const slides = collectSlides(children)
  const [internalIndex, setInternalIndex] = useState(defaultIndex)
  const current = clampIndex(index ?? internalIndex, slides.length)
  const root = useRef<HTMLDivElement>(null)
  const lastFocused = useRef<HTMLElement | null>(null)
  const [canFullscreen, setCanFullscreen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState(false)
  const copy = { ...defaultLabels, ...labels }
  useImperativeHandle(ref, () => root.current!, [])

  useEffect(() => {
    setCanFullscreen(typeof root.current?.requestFullscreen === 'function' && document.fullscreenEnabled !== false)
    function updateFullscreen() {
      setIsFullscreen(document.fullscreenElement === root.current)
    }
    document.addEventListener('fullscreenchange', updateFullscreen)
    return () => document.removeEventListener('fullscreenchange', updateFullscreen)
  }, [])

  useEffect(() => {
    const element = lastFocused.current
    const deck = root.current
    if (view !== 'presentation' || !element || !deck || !deck.contains(element)) return
    const pane = Array.from(
      deck.querySelectorAll<HTMLElement>(':scope > .cake-slide-deck-stage > .cake-slide-deck-page')
    ).find((page) => page.contains(element))
    if (
      pane?.getAttribute('data-active') === 'false' &&
      (document.activeElement === document.body || pane.contains(document.activeElement))
    ) {
      deck.focus({ preventScroll: true })
    }
  }, [current, view])

  function goTo(requested: number) {
    if (!slides.length) return
    const next = loop
      ? ((requested % slides.length) + slides.length) % slides.length
      : clampIndex(requested, slides.length)
    if (next === current) return
    if (index === undefined) setInternalIndex(next)
    onIndexChange?.(next)
  }

  async function toggleFullscreen() {
    setFullscreenError(false)
    try {
      if (document.fullscreenElement === root.current) await document.exitFullscreen()
      else await root.current?.requestFullscreen()
    } catch (error) {
      setFullscreenError(true)
      onFullscreenError?.(error)
    }
  }

  return (
    <div
      role="region"
      aria-label="Presentation"
      tabIndex={0}
      {...props}
      ref={root}
      className={cx('cake-slide-deck', className)}
      data-view={view}
      data-theme={theme}
      data-mode={mode}
      style={{ '--cake-slide-ratio': ratio.replace(':', ' / '), ...style } as CSSProperties}
      onFocusCapture={(event) => {
        lastFocused.current = event.target
        onFocusCapture?.(event)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (
          event.defaultPrevented ||
          !keyboard ||
          view !== 'presentation' ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return
        const target = event.target as HTMLElement
        if (
          target.closest('.cake-slide-deck') !== root.current ||
          target.closest(
            'input, textarea, select, button, a, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="switch"], [role="checkbox"], [role="radio"], [role="spinbutton"], [role="slider"], [role="textbox"], [role="combobox"], [role="menu"], [role="listbox"], [role="tablist"], audio, video, pre'
          )
        )
          return
        switch (event.key) {
          case 'ArrowRight':
          case 'PageDown':
            event.preventDefault()
            goTo(current + 1)
            break
          case 'ArrowLeft':
          case 'PageUp':
            event.preventDefault()
            goTo(current - 1)
            break
          case ' ':
            event.preventDefault()
            goTo(current + (event.shiftKey ? -1 : 1))
            break
          case 'Home':
            event.preventDefault()
            goTo(0)
            break
          case 'End':
            event.preventDefault()
            goTo(slides.length - 1)
            break
        }
      }}
    >
      <div
        className="cake-slide-deck-stage"
        style={
          {
            '--cake-slide-active-ratio': (slides[current]?.element.props.ratio ?? ratio).replace(':', ' / '),
          } as CSSProperties
        }
      >
        {slides.map(({ key, element }, position) => (
          <div
            key={key}
            className="cake-slide-deck-page"
            data-active={position === current}
            role="group"
            aria-roledescription="slide"
            aria-label={`${copy.slide} ${position + 1} / ${slides.length}${element.props['aria-label'] ? `: ${element.props['aria-label']}` : ''}`}
            aria-hidden={view === 'presentation' && position !== current ? true : undefined}
            inert={view === 'presentation' && position !== current ? true : undefined}
          >
            {element}
          </div>
        ))}
        {!slides.length && <div className="cake-slide-deck-empty">{copy.empty}</div>}
      </div>
      {view === 'presentation' && controls && (
        <div className="cake-slide-deck-controls">
          <button
            type="button"
            className="cake-slide-deck-button"
            onClick={() => goTo(current - 1)}
            disabled={!slides.length || (!loop && current === 0)}
          >
            {copy.previous}
          </button>
          <span className="cake-slide-deck-counter" role="status" aria-live="polite" aria-atomic="true">
            <span aria-hidden="true">
              {slides.length ? current + 1 : 0} / {slides.length}
            </span>
            <span className="cake-slide-deck-announcement">
              {slides.length
                ? `${copy.slide} ${current + 1} / ${slides.length}${slides[current].element.props['aria-label'] ? `: ${slides[current].element.props['aria-label']}` : ''}`
                : copy.empty}
            </span>
          </span>
          <button
            type="button"
            className="cake-slide-deck-button"
            onClick={() => goTo(current + 1)}
            disabled={!slides.length || (!loop && current === slides.length - 1)}
          >
            {copy.next}
          </button>
          {fullscreen && (
            <button
              type="button"
              className="cake-slide-deck-button cake-slide-deck-fullscreen"
              disabled={!canFullscreen}
              title={!canFullscreen ? copy.fullscreenUnavailable : undefined}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? copy.exitFullscreen : copy.enterFullscreen}
            </button>
          )}
        </div>
      )}
      {fullscreenError && (
        <div className="cake-slide-deck-error" role="alert">
          {copy.fullscreenUnavailable}
        </div>
      )}
    </div>
  )
}
