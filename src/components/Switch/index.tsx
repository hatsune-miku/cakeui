import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type SwitchProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'size'>
export function Switch({ children, className, ...props }: SwitchProps) {
  return (
    <label className={cx('cake-switch', className)}>
      <input {...props} type="checkbox" role="switch" className="cake-switch-input" />
      {children && <span className="cake-switch-label">{children}</span>}
    </label>
  )
}
