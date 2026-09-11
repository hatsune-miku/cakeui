import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'
import { panelId, tabId, useTabs } from '../Tabs/context'

export interface TabProps extends Omit<ComponentPropsWithRef<'button'>, 'value'> {
  value: string
}
export function Tab({ value, className, onClick, disabled, ...props }: TabProps) {
  const context = useTabs()
  const selected = context.value === value
  return (
    <button
      {...props}
      type="button"
      className={cx('cake-tab', className)}
      role="tab"
      id={tabId(context.id, value)}
      aria-controls={panelId(context.id, value)}
      aria-selected={selected}
      tabIndex={selected && !disabled ? 0 : -1}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) context.setValue(value)
      }}
    />
  )
}
