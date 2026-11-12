import { type ComponentPropsWithRef } from 'react'

import { cx } from '../../../utils'

export interface SlideColumnsProps extends ComponentPropsWithRef<'div'> {
  columns?: 2 | 3 | 4
  balance?: 'equal' | 'wide-left' | 'wide-right'
}

export function SlideColumns({ columns = 2, balance = 'equal', className, ...props }: SlideColumnsProps) {
  return (
    <div {...props} className={cx('cake-slide-columns', className)} data-columns={columns} data-balance={balance} />
  )
}
