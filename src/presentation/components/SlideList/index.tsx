import { type ComponentPropsWithRef } from 'react'

import { cx } from '../../../utils'

export interface SlideListProps extends ComponentPropsWithRef<'ul'> {}

export function SlideList({ className, ...props }: SlideListProps) {
  return <ul {...props} className={cx('cake-slide-list', className)} />
}
