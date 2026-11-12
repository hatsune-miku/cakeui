import { type ComponentPropsWithRef, type ReactNode } from 'react'

import { cx } from '../../../utils'

export interface SlideFigureProps extends ComponentPropsWithRef<'figure'> {
  caption?: ReactNode
}

export function SlideFigure({ caption, children, className, ...props }: SlideFigureProps) {
  return (
    <figure {...props} className={cx('cake-slide-figure', className)}>
      <div className="cake-slide-figure-media">{children}</div>
      {caption != null && <figcaption className="cake-slide-figure-caption">{caption}</figcaption>}
    </figure>
  )
}
