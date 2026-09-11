import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type TableHeadProps = ComponentPropsWithRef<'thead'>
export function TableHead({ className, ...props }: TableHeadProps) {
  return <thead {...props} className={cx('cake-table-head', className)} />
}
