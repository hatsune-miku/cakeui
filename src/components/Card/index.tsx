import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export interface CardProps extends ComponentPropsWithRef<'div'> {
  padding?: 'none' | 'small' | 'medium' | 'large'
}
export function Card({ padding = 'medium', className, ...props }: CardProps) {
  return <div {...props} data-padding={padding} className={cx('cake-card', className)} />
}
