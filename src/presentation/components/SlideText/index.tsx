import { type ComponentPropsWithRef } from 'react'

import { cx } from '../../../utils'

export interface SlideTextProps extends ComponentPropsWithRef<'p'> {
  size?: 'body' | 'lead' | 'small'
  muted?: boolean
}

export function SlideText({ size = 'body', muted = false, className, ...props }: SlideTextProps) {
  return <p {...props} className={cx('cake-slide-text', className)} data-size={size} data-muted={muted} />
}
