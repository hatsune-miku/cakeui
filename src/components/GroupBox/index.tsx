import type { ComponentPropsWithRef, ReactNode } from 'react'

import { cx } from '../../utils'

export interface GroupBoxProps extends ComponentPropsWithRef<'fieldset'> {
  label: ReactNode
}
export function GroupBox({ label, children, className, ...props }: GroupBoxProps) {
  return (
    <fieldset {...props} className={cx('cake-groupbox', className)}>
      <legend className="cake-groupbox-legend">{label}</legend>
      {children}
    </fieldset>
  )
}
