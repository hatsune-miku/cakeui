import {
  type CSSProperties,
  Children,
  type ComponentPropsWithRef,
  type ReactNode,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react'

import { cx } from '../../../utils'

export interface SlideNavigatorProps extends ComponentPropsWithRef<'nav'> {
  index: number
  onIndexChange: (index: number) => void
  context?: ReactNode
}

/** A controlled axis of slide or chapter labels, independent of the deck's page model. */
export function SlideNavigator({
  index,
  onIndexChange,
  context,
  children,
  className,
  onKeyDown,
  ref,
  ...props
}: SlideNavigatorProps) {
  const items = Children.toArray(children)
  const current = Math.min(Math.max(0, Number.isFinite(index) ? Math.trunc(index) : 0), Math.max(0, items.length - 1))
  const root = useRef<HTMLElement>(null)
  const keyboardTarget = useRef<number | null>(null)
  useImperativeHandle(ref, () => root.current!, [])
  useLayoutEffect(() => {
    if (keyboardTarget.current === current) {
      root.current?.querySelector<HTMLButtonElement>(`[data-index="${current}"]`)?.focus({ preventScroll: true })
    }
    keyboardTarget.current = null
  }, [current])
  return (
    <nav
      aria-label="Slide navigation"
      {...props}
      ref={root}
      className={cx('cake-slide-navigator', className)}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
        const button = (event.target as Element).closest<HTMLButtonElement>('.cake-slide-navigator-item')
        if (!button || button.closest('.cake-slide-navigator') !== event.currentTarget) return
        const position = Number(button.dataset.index)
        const requested =
          event.key === 'ArrowLeft'
            ? position - 1
            : event.key === 'ArrowRight'
              ? position + 1
              : event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? items.length - 1
                  : undefined
        if (requested === undefined) return
        event.preventDefault()
        event.stopPropagation()
        const next = Math.min(Math.max(0, requested), items.length - 1)
        if (next !== current) {
          keyboardTarget.current = next
          onIndexChange(next)
        }
      }}
    >
      <div className="cake-slide-navigator-axis">
        {items.map((label, position) => {
          const offset = position - current
          const distance = Math.abs(offset)
          return (
            <button
              type="button"
              key={position}
              className="cake-slide-navigator-item"
              data-index={position}
              data-distance={Math.min(distance, 3)}
              aria-current={offset === 0 ? 'step' : undefined}
              aria-hidden={distance > 2 ? true : undefined}
              inert={distance > 2 ? true : undefined}
              tabIndex={distance > 2 ? -1 : 0}
              style={{ '--cake-slide-navigator-offset': offset } as CSSProperties}
              onClick={() => position !== current && onIndexChange(position)}
            >
              <span className="cake-slide-navigator-label">{label}</span>
            </button>
          )
        })}
      </div>
      {context != null && <div className="cake-slide-navigator-context">{context}</div>}
    </nav>
  )
}
