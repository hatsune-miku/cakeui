import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type NumberBoxProps = Omit<ComponentPropsWithRef<'input'>, 'type'>
export function NumberBox({ className, ...props }: NumberBoxProps) {
  return <input {...props} type="number" className={cx('cake-numberbox', className)} />
}
