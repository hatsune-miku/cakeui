import { Children, type ComponentPropsWithRef, Fragment, type ReactNode, cloneElement, isValidElement } from 'react'

import { SearchableComboBox } from './components/SearchableComboBox'

import { cx } from '../../utils'

export interface ComboBoxProps extends ComponentPropsWithRef<'select'> {
  searchable?: boolean
  searchPlaceholder?: string
  emptyText?: string
}
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
/** Native select by default, with optional searchable single selection and the same form value. */
export function ComboBox({
  searchable = false,
  searchPlaceholder,
  emptyText,
  className,
  children,
  ...props
}: ComboBoxProps) {
  if (searchable && !props.multiple && (props.size === undefined || props.size <= 1)) {
    return (
      <SearchableComboBox {...props} className={className} searchPlaceholder={searchPlaceholder} emptyText={emptyText}>
        {styleOptions(children)}
      </SearchableComboBox>
    )
  }

  return (
    <select {...props} className={cx('cake-combobox', className)}>
      {styleOptions(children)}
    </select>
  )
}
