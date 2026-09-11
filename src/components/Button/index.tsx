import type { ComponentPropsWithRef } from 'react'

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
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-size={size}
      className={cx('cake-button', className)}
    >
      {loading && <Spinner size="small" aria-hidden="true" />}
      {children}
    </button>
  )
}
