import { type ComponentPropsWithRef } from 'react'

import { cx } from '../../../utils'

export interface SlideTitleProps extends ComponentPropsWithRef<'h2'> {
  level?: 1 | 2 | 3
  size?: 'display' | 'large' | 'medium'
}

export function SlideTitle({ level = 2, size = 'large', className, ...props }: SlideTitleProps) {
  const Heading = level === 1 ? 'h1' : level === 3 ? 'h3' : 'h2'
  return <Heading {...props} className={cx('cake-slide-title', className)} data-size={size} />
}
