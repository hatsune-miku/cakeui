import type { ComponentPropsWithRef } from 'react'

import { type Tone, cx } from '../../utils'

export interface AlertProps extends ComponentPropsWithRef<'div'> {
  tone?: Tone
}
export function Alert({ tone = 'accent', className, ...props }: AlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      {...props}
      data-tone={tone}
      className={cx('cake-alert', className)}
    />
  )
}
