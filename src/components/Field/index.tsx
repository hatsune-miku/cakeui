import type { ComponentPropsWithRef, ReactNode } from 'react'

import { cx } from '../../utils'

export interface FieldProps extends ComponentPropsWithRef<'div'> {
  label: ReactNode
  htmlFor: string
  description?: ReactNode
  error?: ReactNode
}
export function Field({ label, htmlFor, description, error, className, children, ...props }: FieldProps) {
  return (
    <div {...props} className={cx('cake-field', className)}>
      <label className="cake-field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {(error || description) && (
        <div id={htmlFor + '-help'} className="cake-field-help" data-error={!!error} role={error ? 'alert' : undefined}>
          {error || description}
        </div>
      )}
    </div>
  )
}
