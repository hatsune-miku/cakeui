import { type ComponentPropsWithRef, type ReactNode } from 'react'

import { cx } from '../../../utils'

export interface SlideFooterProps extends ComponentPropsWithRef<'footer'> {
  page?: ReactNode
  source?: ReactNode
}

export function SlideFooter({ page, source, children, className, ...props }: SlideFooterProps) {
  return (
    <footer {...props} className={cx('cake-slide-footer', className)}>
      <div className="cake-slide-footer-content">{children}</div>
      {source != null && <div className="cake-slide-footer-source">{source}</div>}
      {page != null && <div className="cake-slide-footer-page">{page}</div>}
    </footer>
  )
}
