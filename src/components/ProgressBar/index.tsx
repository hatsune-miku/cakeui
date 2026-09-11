import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type ProgressBarProps = ComponentPropsWithRef<'progress'>
export function ProgressBar({ className, max = 100, ...props }: ProgressBarProps) {
  return <progress {...props} max={max} className={cx('cake-progress', className)} />
}
