import { type ComponentPropsWithoutRef, useEffect, useRef, useState } from 'react'

import { type Tone, cx } from '../../utils'
import { Button } from '../Button'

export interface ToastProps extends ComponentPropsWithoutRef<'div'> {
  open: boolean
  onOpenChange: (open: boolean) => void
  duration?: number
  tone?: Tone
  closeLabel?: string
}
/** One controlled notification. duration=0 keeps it visible until dismissed. */
export function Toast({
  open,
  onOpenChange,
  duration = 4500,
  tone = 'success',
  closeLabel = 'Dismiss',
  className,
  children,
  ...props
}: ToastProps) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(duration)
  const callback = useRef(onOpenChange)
  useEffect(() => {
    callback.current = onOpenChange
  }, [onOpenChange])
  useEffect(() => {
    remaining.current = duration
    setPaused(false)
  }, [open, duration])
  useEffect(() => {
    if (!open || paused || duration <= 0) return
    const start = Date.now()
    const timer = setTimeout(() => callback.current(false), remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - start))
    }
  }, [open, paused, duration])
  return (
    <div
      role="status"
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      aria-atomic="true"
      {...props}
      className={cx('cake-toast', className)}
      data-tone={tone}
      data-open={open}
      onPointerEnter={(event) => {
        props.onPointerEnter?.(event)
        setPaused(true)
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event)
        if (!event.currentTarget.contains(document.activeElement)) setPaused(false)
      }}
      onFocus={(event) => {
        props.onFocus?.(event)
        setPaused(true)
      }}
      onBlur={(event) => {
        props.onBlur?.(event)
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
      }}
    >
      {open && (
        <>
          <span className="cake-toast-content">{children}</span>
          <Button variant="ghost" size="small" aria-label={closeLabel} onClick={() => onOpenChange(false)}>
            ×
          </Button>
        </>
      )}
    </div>
  )
}
