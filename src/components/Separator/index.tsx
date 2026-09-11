import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type SeparatorProps = ComponentPropsWithRef<'hr'>
export function Separator({ className, ...props }: SeparatorProps) {
  return <hr {...props} className={cx('cake-separator', className)} />
}
