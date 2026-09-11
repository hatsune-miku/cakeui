import { type ComponentPropsWithoutRef, useEffect, useRef } from 'react'

import { cx } from '../../utils'

export interface LogViewProps extends ComponentPropsWithoutRef<'div'> {
  follow?: boolean
}
export function LogView({ follow = true, children, className, onScroll, ...props }: LogViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  useEffect(() => {
    const element = container.current
    if (element && follow && atBottom.current) element.scrollTop = element.scrollHeight
  }, [children, follow])
  return (
    <div
      role="log"
      aria-label="Logs"
      aria-live="polite"
      aria-relevant="additions text"
      tabIndex={0}
      {...props}
      ref={container}
      className={cx('cake-logview', className)}
      onScroll={(event) => {
        const element = event.currentTarget
        atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 24
        onScroll?.(event)
      }}
    >
      {children}
    </div>
  )
}
