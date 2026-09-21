import { type ComponentPropsWithRef, type ReactNode } from 'react'

import { cx } from '../../../utils'

export interface SlideStatProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  value: ReactNode
  label: ReactNode
  detail?: ReactNode
}

export function SlideStat({ value, label, detail, className, ...props }: SlideStatProps) {
  return (
    <div {...props} className={cx('cake-slide-stat', className)}>
      <div className="cake-slide-stat-value">{value}</div>
      <div className="cake-slide-stat-label">{label}</div>
      {detail != null && <div className="cake-slide-stat-detail">{detail}</div>}
    </div>
  )
}
