import { type ComponentPropsWithRef } from 'react'

import { cx } from '../../../utils'

export interface SlideListItemProps extends ComponentPropsWithRef<'li'> {}

export function SlideListItem({ className, ...props }: SlideListItemProps) {
  return <li {...props} className={cx('cake-slide-list-item', className)} />
}
