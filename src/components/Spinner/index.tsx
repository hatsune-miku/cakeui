import type { ComponentPropsWithRef } from 'react'

import { type Size, cx } from '../../utils'

export interface SpinnerProps extends ComponentPropsWithRef<'span'> {
  size?: Size
}
export function Spinner({ size = 'medium', className, ...props }: SpinnerProps) {
  return (
    <span role="status" aria-label="Loading" {...props} data-size={size} className={cx('cake-spinner', className)} />
  )
}
