import { type ComponentPropsWithRef, type ReactNode } from 'react'

import { cx } from '../../../utils'

export interface SlideQuoteProps extends ComponentPropsWithRef<'blockquote'> {
  attribution?: ReactNode
}

export function SlideQuote({ attribution, children, className, ...props }: SlideQuoteProps) {
  return (
    <blockquote {...props} className={cx('cake-slide-quote', className)}>
      <div className="cake-slide-quote-content">{children}</div>
      {attribution != null && <footer className="cake-slide-quote-attribution">{attribution}</footer>}
    </blockquote>
  )
}
