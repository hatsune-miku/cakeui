import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type BreadcrumbProps = ComponentPropsWithRef<'nav'>
export function Breadcrumb({ className, children, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" {...props} className={cx('cake-breadcrumb', className)}>
      <ol className="cake-breadcrumb-list">{children}</ol>
    </nav>
  )
}
