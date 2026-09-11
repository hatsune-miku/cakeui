import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type TableProps = ComponentPropsWithRef<'table'>
/** A real table. Compose ordinary children; sort and render your own data. */
export function Table({ className, ...props }: TableProps) {
  return <table {...props} className={cx('cake-table', className)} />
}
