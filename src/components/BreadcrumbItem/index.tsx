import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type BreadcrumbItemProps = ComponentPropsWithRef<'li'>
export function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
  return <li {...props} className={cx('cake-breadcrumb-item', className)} />
}
