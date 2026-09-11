import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'
import { useTabs } from '../Tabs/context'

export type TabListProps = ComponentPropsWithRef<'div'>
export function TabList({ className, onKeyDown, ...props }: TabListProps) {
  const { orientation } = useTabs()
  return (
    <div
      {...props}
      className={cx('cake-tablist', className)}
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || (event.target as HTMLElement).getAttribute('role') !== 'tab') return
        const keys = orientation === 'horizontal' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']
        if (![...keys, 'Home', 'End'].includes(event.key)) return
        const items = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')
        ).filter((item) => item.closest('[role="tablist"]') === event.currentTarget)
        if (!items.length) return
        event.preventDefault()
        const index = items.indexOf(event.target as HTMLButtonElement)
        const rtl = orientation === 'horizontal' && getComputedStyle(event.currentTarget).direction === 'rtl'
        const delta = (event.key === keys[1] ? 1 : -1) * (rtl ? -1 : 1)
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : (index + delta + items.length) % items.length
        items[next].focus()
        items[next].click()
      }}
    />
  )
}
