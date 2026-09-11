import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type TableHeaderProps = ComponentPropsWithRef<'th'>
export function TableHeader({ className, scope = 'col', ...props }: TableHeaderProps) {
  return <th {...props} scope={scope} className={cx('cake-table-header', className)} />
}
