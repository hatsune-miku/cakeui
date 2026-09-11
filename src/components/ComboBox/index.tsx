import { Children, type ComponentPropsWithRef, Fragment, type ReactNode, cloneElement, isValidElement } from 'react'

import { cx } from '../../utils'

export type ComboBoxProps = ComponentPropsWithRef<'select'>
function styleOptions(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) return child
    if (child.type === 'option')
      return cloneElement(child, { className: cx('cake-combobox-option', child.props.className) })
    if (child.type === 'optgroup')
      return cloneElement(child, {
        className: cx('cake-combobox-group', child.props.className),
        children: styleOptions(child.props.children),
      })
    if (child.type === Fragment) return cloneElement(child, { children: styleOptions(child.props.children) })
    return child
  })
}
/** Styled native picker; selection, validation, reset and keyboard behavior stay native. */
export function ComboBox({ className, children, ...props }: ComboBoxProps) {
  return (
    <select {...props} className={cx('cake-combobox', className)}>
      {styleOptions(children)}
    </select>
  )
}
