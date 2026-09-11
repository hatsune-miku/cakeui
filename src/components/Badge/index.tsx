import type { ComponentPropsWithRef } from 'react'

import { type Tone, cx } from '../../utils'

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  tone?: Tone
}
export function Badge({ tone = 'accent', className, ...props }: BadgeProps) {
  return <span {...props} data-tone={tone} className={cx('cake-badge', className)} />
}
