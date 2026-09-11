import { type ComponentPropsWithRef, useId } from 'react'

import { TabsContext } from './context'

import { useControllable } from '../../hooks/useControllable'
import { cx } from '../../utils'

export interface TabsProps extends Omit<ComponentPropsWithRef<'div'>, 'onChange' | 'defaultValue'> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
}
export function Tabs({
  value,
  defaultValue = '',
  onValueChange,
  orientation = 'horizontal',
  className,
  children,
  ...props
}: TabsProps) {
  const id = useId()
  const [current, setValue] = useControllable(value, defaultValue, onValueChange)
  return (
    <TabsContext.Provider value={{ id, value: current, setValue, orientation }}>
      <div {...props} className={cx('cake-tabs', className)} data-orientation={orientation}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}
