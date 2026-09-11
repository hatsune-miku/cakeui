import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'
import { panelId, tabId, useTabs } from '../Tabs/context'

export interface TabPanelProps extends ComponentPropsWithRef<'div'> {
  value: string
}
export function TabPanel({ value, className, ...props }: TabPanelProps) {
  const context = useTabs()
  return (
    <div
      {...props}
      className={cx('cake-tabpanel', className)}
      role="tabpanel"
      tabIndex={0}
      id={panelId(context.id, value)}
      aria-labelledby={tabId(context.id, value)}
      hidden={context.value !== value}
    />
  )
}
