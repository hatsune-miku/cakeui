import { type ComponentPropsWithRef } from 'react'

import { cx } from '../../../utils'

export interface SlidePanelProps extends ComponentPropsWithRef<'div'> {
  variant?: 'soft' | 'outline' | 'accent'
}

export function SlidePanel({ variant = 'soft', className, ...props }: SlidePanelProps) {
  return <div {...props} className={cx('cake-slide-panel', className)} data-variant={variant} />
}
