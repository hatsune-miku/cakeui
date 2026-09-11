import type { ComponentPropsWithRef } from 'react'

import { type Tone, cx } from '../../utils'

export interface DotProps extends ComponentPropsWithRef<'span'> {
  tone?: Tone
}
export function Dot({ tone = 'neutral', className, ...props }: DotProps) {
  return (
    <span
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      {...props}
      data-tone={tone}
      className={cx('cake-dot', className)}
    />
  )
}
