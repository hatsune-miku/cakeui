import { type ComponentPropsWithRef, useRef } from 'react'

import { type Size, cx } from '../../utils'
import { Spinner } from '../Spinner'

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  size?: Size
  loading?: boolean
}
export function Button({
  variant = 'default',
  size = 'medium',
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  onPointerDown,
  onMouseDown,
  onClickCapture,
  ...props
}: ButtonProps) {
  const mouseDown = useRef<MouseEvent | null>(null)
  const pointerDown = useRef<PointerEvent | null>(null)
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-size={size}
      className={cx('cake-button', className)}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        pointerDown.current = event.nativeEvent
        mouseDown.current = null
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event)
        mouseDown.current = event.nativeEvent
      }}
      onClickCapture={(event) => {
        onClickCapture?.(event)
        // WebKit does not focus pointer-clicked buttons, so native dialogs otherwise lose their opener.
        // Read finished press events so ancestor handlers and cancelled pointer compatibility events are honored.
        if (
          event.detail > 0 &&
          !event.defaultPrevented &&
          !pointerDown.current?.defaultPrevented &&
          !mouseDown.current?.defaultPrevented
        )
          event.currentTarget.focus({ preventScroll: true })
        mouseDown.current = null
        pointerDown.current = null
      }}
    >
      {loading && <Spinner size="small" aria-hidden="true" />}
      {children}
    </button>
  )
}
