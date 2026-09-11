import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type TextBoxProps = ComponentPropsWithRef<'input'>
export function TextBox({ className, type = 'text', ...props }: TextBoxProps) {
  return <input {...props} type={type} className={cx('cake-textbox', className)} />
}
