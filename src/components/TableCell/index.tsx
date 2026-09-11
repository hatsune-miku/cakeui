import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type TableCellProps = ComponentPropsWithRef<'td'>
export function TableCell({ className, ...props }: TableCellProps) {
  return <td {...props} className={cx('cake-table-cell', className)} />
}
