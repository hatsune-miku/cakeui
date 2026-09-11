import { type ComponentPropsWithRef, useEffect, useRef } from 'react'

import { cx } from '../../utils'

export interface CheckBoxProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size'> {
  indeterminate?: boolean
}
export function CheckBox({ children, indeterminate = false, className, ref, ...props }: CheckBoxProps) {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (input.current) input.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <label className={cx('cake-checkbox', className)}>
      <input
        {...props}
        ref={(node) => {
          input.current = node
          if (typeof ref === 'function') return ref(node)
          if (ref) ref.current = node
        }}
        type="checkbox"
        aria-checked={indeterminate ? 'mixed' : undefined}
        className="cake-checkbox-input"
      />
      {children && <span className="cake-checkbox-label">{children}</span>}
    </label>
  )
}
