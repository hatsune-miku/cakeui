import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type MenuSeparatorProps = ComponentPropsWithRef<'div'>
export function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
  return <div {...props} role="separator" className={cx('cake-menu-separator', className)} />
}
