import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type RadioButtonProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'size'>
export function RadioButton({ children, className, ...props }: RadioButtonProps) {
  return (
    <label className={cx('cake-radio', className)}>
      <input {...props} type="radio" className="cake-radio-input" />
      {children && <span className="cake-radio-label">{children}</span>}
    </label>
  )
}
