import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type SkeletonProps = ComponentPropsWithRef<'span'>
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <span aria-hidden="true" {...props} className={cx('cake-skeleton', className)} />
}
