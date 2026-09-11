import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type TextAreaProps = ComponentPropsWithRef<'textarea'>
export function TextArea({ className, rows = 4, ...props }: TextAreaProps) {
  return <textarea {...props} rows={rows} className={cx('cake-textarea', className)} />
}
