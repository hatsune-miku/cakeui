import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type TableBodyProps = ComponentPropsWithRef<'tbody'>
export function TableBody({ className, ...props }: TableBodyProps) {
  return <tbody {...props} className={cx('cake-table-body', className)} />
}
