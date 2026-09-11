import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type ListViewProps = ComponentPropsWithRef<'ul'>
export function ListView({ className, ...props }: ListViewProps) {
  return <ul {...props} className={cx('cake-listview', className)} />
}
