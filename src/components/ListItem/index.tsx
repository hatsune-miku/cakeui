import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type ListItemProps = ComponentPropsWithRef<'li'>
export function ListItem({ className, ...props }: ListItemProps) {
  return <li {...props} className={cx('cake-listitem', className)} />
}
