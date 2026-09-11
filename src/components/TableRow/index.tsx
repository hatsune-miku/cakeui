import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type TableRowProps = ComponentPropsWithRef<'tr'>
export function TableRow({ className, ...props }: TableRowProps) {
  return <tr {...props} className={cx('cake-table-row', className)} />
}
